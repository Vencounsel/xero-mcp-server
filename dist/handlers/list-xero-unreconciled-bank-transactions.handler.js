import axios from "axios";
import { xeroClient } from "../clients/xero-client.js";
import { formatError } from "../helpers/format-error.js";
/**
 * Fetch unreconciled bank statement lines via the Xero Finance API.
 * Uses GET /finance.xro/1.0/BankStatements/Accounting
 * which returns actual bank feed statement lines (the reconciliation queue).
 *
 * Falls back to direct HTTP since the Finance API scope
 * (finance.bankstatementsplus.read) may not be available on Custom Connections.
 * In that case, tries the Accounting API Reports/BankStatement endpoint.
 */
async function getUnreconciledStatementLines(bankAccountId, fromDate, toDate) {
    await xeroClient.authenticate();
    const tokenSet = xeroClient.readTokenSet();
    const accessToken = tokenSet.access_token;
    const tenantId = xeroClient.tenantId;
    const headers = {
        Authorization: `Bearer ${accessToken}`,
        "xero-tenant-id": tenantId,
        Accept: "application/json",
    };
    // Try the Finance API first (requires finance.bankstatementsplus.read scope)
    try {
        const financeResponse = await axios.get("https://api.xero.com/finance.xro/1.0/BankStatementsPlus/statements", {
            headers,
            params: {
                BankAccountID: bankAccountId,
                FromDate: fromDate,
                ToDate: toDate,
                SummaryOnly: false,
            },
        });
        const data = financeResponse.data;
        const allLines = data.statements?.flatMap((stmt) => stmt.statementLines ?? []) ?? [];
        const unreconciledLines = allLines.filter((line) => line.isReconciled === false);
        return {
            bankAccountId: data.bankAccountId ?? bankAccountId,
            bankAccountName: data.bankAccountName ?? "",
            currencyCode: data.bankAccountCurrencyCode ?? "",
            unreconciledLines,
            totalUnreconciled: unreconciledLines.length,
        };
    }
    catch (financeError) {
        // Finance API not available — try Accounting Reports/BankStatement
        try {
            const reportResponse = await axios.get("https://api.xero.com/api.xro/2.0/Reports/BankStatement", {
                headers,
                params: {
                    bankAccountID: bankAccountId,
                    fromDate,
                    toDate,
                },
            });
            const report = reportResponse.data?.Reports?.[0];
            if (!report) {
                throw new Error("No bank statement report returned");
            }
            // Parse the report rows into statement lines
            const lines = [];
            const rows = report.Rows ?? [];
            for (const section of rows) {
                if (section.RowType === "Section" && section.Rows) {
                    for (const row of section.Rows) {
                        if (row.RowType === "Row" && row.Cells) {
                            const cells = row.Cells;
                            lines.push({
                                statementLineId: "",
                                postedDate: cells[0]?.Value ?? "",
                                payee: cells[1]?.Value ?? "",
                                reference: cells[2]?.Value ?? "",
                                notes: "",
                                amount: parseFloat(cells[3]?.Value ?? "0") || 0,
                                transactionDate: cells[0]?.Value ?? "",
                                type: "",
                                isReconciled: false,
                            });
                        }
                    }
                }
            }
            return {
                bankAccountId,
                bankAccountName: report.ReportName ?? "",
                currencyCode: "",
                unreconciledLines: lines,
                totalUnreconciled: lines.length,
            };
        }
        catch (reportError) {
            // Both approaches failed — throw a descriptive error
            const financeMsg = financeError instanceof Error ? financeError.message : String(financeError);
            const reportMsg = reportError instanceof Error ? reportError.message : String(reportError);
            throw new Error(`Unable to retrieve bank statement lines. ` +
                `Finance API error: ${financeMsg}. ` +
                `Reports API error: ${reportMsg}. ` +
                `The Finance API requires the 'finance.bankstatementsplus.read' scope ` +
                `which may not be available on Custom Connection apps.`);
        }
    }
}
/**
 * List unreconciled bank statement lines from Xero.
 * Tries the Finance API first, then falls back to the Reports API.
 * These are the items shown on Xero's reconciliation screen.
 * @param bankAccountId Bank account ID (required)
 * @param fromDate Start date in YYYY-MM-DD format
 * @param toDate End date in YYYY-MM-DD format
 */
export async function listXeroUnreconciledBankTransactions(bankAccountId, fromDate, toDate) {
    try {
        const result = await getUnreconciledStatementLines(bankAccountId, fromDate, toDate);
        return {
            result,
            isError: false,
            error: null,
        };
    }
    catch (error) {
        return {
            result: null,
            isError: true,
            error: formatError(error),
        };
    }
}

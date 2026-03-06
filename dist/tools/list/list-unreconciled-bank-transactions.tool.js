import { z } from "zod";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { listXeroUnreconciledBankTransactions } from "../../handlers/list-xero-unreconciled-bank-transactions.handler.js";
const ListUnreconciledBankTransactionsTool = CreateXeroTool("list-unreconciled-bank-transactions", `List unreconciled bank statement lines from Xero's bank feeds.
  Uses the Finance API to retrieve the actual bank feed statement lines
  that haven't been matched or coded yet — these are the same items shown
  on Xero's reconciliation screen.
  Requires a specific bank account ID and a date range.
  Use the list-accounts tool first to get bank account IDs if needed.`, {
    bankAccountId: z
        .string()
        .describe("Bank account ID (UUID) to retrieve unreconciled statement lines for"),
    fromDate: z
        .string()
        .describe("Start date in YYYY-MM-DD format"),
    toDate: z
        .string()
        .describe("End date in YYYY-MM-DD format"),
}, async ({ bankAccountId, fromDate, toDate }) => {
    const response = await listXeroUnreconciledBankTransactions(bankAccountId, fromDate, toDate);
    if (response.isError) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error listing unreconciled statement lines: ${response.error}`,
                },
            ],
        };
    }
    const result = response.result;
    return {
        content: [
            {
                type: "text",
                text: `Bank Account: ${result?.bankAccountName} (${result?.bankAccountId})`,
            },
            {
                type: "text",
                text: `Currency: ${result?.currencyCode}`,
            },
            {
                type: "text",
                text: `Found ${result?.totalUnreconciled || 0} unreconciled statement lines:`,
            },
            ...(result?.unreconciledLines?.map((line) => ({
                type: "text",
                text: [
                    `Statement Line ID: ${line.statementLineId}`,
                    `Date: ${line.postedDate || line.transactionDate}`,
                    line.payee ? `Payee: ${line.payee}` : null,
                    line.reference ? `Reference: ${line.reference}` : null,
                    line.notes ? `Notes: ${line.notes}` : null,
                    `Amount: ${line.amount}`,
                    line.type ? `Type: ${line.type}` : null,
                ]
                    .filter(Boolean)
                    .join("\n"),
            })) || []),
        ],
    };
});
export default ListUnreconciledBankTransactionsTool;

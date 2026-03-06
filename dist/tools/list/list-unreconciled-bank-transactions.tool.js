import { z } from "zod";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { listXeroUnreconciledBankTransactions } from "../../handlers/list-xero-unreconciled-bank-transactions.handler.js";
import { formatLineItem } from "../../helpers/format-line-item.js";
const ListUnreconciledBankTransactionsTool = CreateXeroTool("list-unreconciled-bank-transactions", `List coded bank transactions in Xero that have not been reconciled
  (IsReconciled==false and Status!="DELETED").
  NOTE: This shows coded transactions not yet matched to a bank feed
  statement line. It does NOT show pending bank feed lines from the
  reconciliation screen — those require the partner-only Finance API.
  Useful for finding stale unreconciled transfers on savings/IRA accounts
  or accounts without active bank feeds.
  Optionally filter by a specific bank account.
  Returns up to 100 transactions per page.`, {
    page: z.number().describe("Page number for pagination (starts at 1)"),
    bankAccountId: z
        .string()
        .optional()
        .describe("Optional bank account ID to filter transactions for a specific account"),
}, async ({ bankAccountId, page }) => {
    const response = await listXeroUnreconciledBankTransactions(page, bankAccountId);
    if (response.isError) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error listing unreconciled bank transactions: ${response.error}`,
                },
            ],
        };
    }
    const bankTransactions = response.result;
    return {
        content: [
            {
                type: "text",
                text: `Found ${bankTransactions?.length || 0} unreconciled coded bank transactions:`,
            },
            ...(bankTransactions?.map((transaction) => ({
                type: "text",
                text: [
                    `Bank Transaction ID: ${transaction.bankTransactionID}`,
                    `Bank Account: ${transaction.bankAccount.name} (${transaction.bankAccount.accountID})`,
                    transaction.contact
                        ? `Contact: ${transaction.contact.name} (${transaction.contact.contactID})`
                        : null,
                    transaction.reference
                        ? `Reference: ${transaction.reference}`
                        : null,
                    transaction.date ? `Date: ${transaction.date}` : null,
                    transaction.subTotal
                        ? `Sub Total: ${transaction.subTotal}`
                        : null,
                    transaction.totalTax
                        ? `Total Tax: ${transaction.totalTax}`
                        : null,
                    transaction.total ? `Total: ${transaction.total}` : null,
                    transaction.type ? `Type: ${transaction.type}` : null,
                    transaction.currencyCode
                        ? `Currency Code: ${transaction.currencyCode}`
                        : null,
                    `${transaction.status || "Unknown"}`,
                    transaction.lineAmountTypes
                        ? `Line Amount Types: ${transaction.lineAmountTypes}`
                        : undefined,
                    transaction.hasAttachments !== undefined
                        ? transaction.hasAttachments
                            ? "Has attachments"
                            : "Does not have attachments"
                        : null,
                    `Line Items: ${transaction.lineItems?.map(formatLineItem)}`,
                ]
                    .filter(Boolean)
                    .join("\n"),
            })) || []),
        ],
    };
});
export default ListUnreconciledBankTransactionsTool;

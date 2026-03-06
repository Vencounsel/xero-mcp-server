import { z } from "zod";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { listXeroUnreconciledBankTransactions } from "../../handlers/list-xero-unreconciled-bank-transactions.handler.js";
import { formatLineItem } from "../../helpers/format-line-item.js";

const ListUnreconciledBankTransactionsTool = CreateXeroTool(
  "list-unreconciled-bank-transactions",
  `List unreconciled bank transactions in Xero.
  This filters bank transactions to show only unreconciled items
  (IsReconciled==false and Status!="DELETED").
  Useful for reconciliation workflows to see what still needs to be matched.
  Optionally filter by a specific bank account.
  Returns up to 100 transactions per page.
  Ask the user if they want the next page after running this tool
  if 100 transactions are returned.`,
  {
    page: z.number().describe("Page number for pagination (starts at 1)"),
    bankAccountId: z
      .string()
      .optional()
      .describe(
        "Optional bank account ID to filter transactions for a specific account",
      ),
  },
  async ({ bankAccountId, page }) => {
    const response = await listXeroUnreconciledBankTransactions(
      page,
      bankAccountId,
    );
    if (response.isError) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error listing unreconciled bank transactions: ${response.error}`,
          },
        ],
      };
    }

    const bankTransactions = response.result;

    return {
      content: [
        {
          type: "text" as const,
          text: `Found ${bankTransactions?.length || 0} unreconciled bank transactions:`,
        },
        ...(bankTransactions?.map((transaction) => ({
          type: "text" as const,
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
  },
);

export default ListUnreconciledBankTransactionsTool;

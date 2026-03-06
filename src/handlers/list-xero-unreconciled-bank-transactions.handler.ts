import { xeroClient } from "../clients/xero-client.js";
import { BankTransaction } from "xero-node";
import { getClientHeaders } from "../helpers/get-client-headers.js";
import { XeroClientResponse } from "../types/tool-response.js";
import { formatError } from "../helpers/format-error.js";

/**
 * Internal function to fetch unreconciled bank transactions from Xero.
 * Uses the where clause to filter for IsReconciled==false and Status!="DELETED".
 */
async function getUnreconciledBankTransactions(
  page: number,
  bankAccountId?: string,
): Promise<BankTransaction[]> {
  await xeroClient.authenticate();

  // Build the where clause: always filter for unreconciled, non-deleted
  let where = 'IsReconciled==false&&Status!="DELETED"';
  if (bankAccountId) {
    where += `&&BankAccount.AccountID=guid("${bankAccountId}")`;
  }

  const response = await xeroClient.accountingApi.getBankTransactions(
    xeroClient.tenantId,
    undefined, // ifModifiedSince
    where,
    "Date DESC", // order
    page,
    undefined, // unitdp
    100, // pageSize — use max for reconciliation workflows
    getClientHeaders(),
  );

  return response.body.bankTransactions ?? [];
}

/**
 * List unreconciled coded bank transactions from Xero.
 * Filters for transactions where IsReconciled==false and Status!="DELETED".
 *
 * NOTE: This returns coded transactions that haven't been matched to a bank
 * feed statement line. It does NOT return pending bank feed lines shown on
 * Xero's reconciliation screen (those require the partner-only Finance API).
 * Useful for finding stale unreconciled transfers on accounts without bank feeds.
 *
 * @param page Page number for pagination (default 1)
 * @param bankAccountId Optional bank account ID to filter by
 */
export async function listXeroUnreconciledBankTransactions(
  page: number = 1,
  bankAccountId?: string,
): Promise<XeroClientResponse<BankTransaction[]>> {
  try {
    const bankTransactions = await getUnreconciledBankTransactions(
      page,
      bankAccountId,
    );

    return {
      result: bankTransactions,
      isError: false,
      error: null,
    };
  } catch (error) {
    return {
      result: null,
      isError: true,
      error: formatError(error),
    };
  }
}

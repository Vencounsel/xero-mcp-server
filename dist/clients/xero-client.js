import axios from "axios";
import dotenv from "dotenv";
import { XeroClient, } from "xero-node";
import { ensureError } from "../helpers/ensure-error.js";
dotenv.config();
const client_id = process.env.XERO_CLIENT_ID;
const client_secret = process.env.XERO_CLIENT_SECRET;
const bearer_token = process.env.XERO_CLIENT_BEARER_TOKEN;
const grant_type = "client_credentials";
if (!bearer_token && (!client_id || !client_secret)) {
    throw Error("Environment Variables not set - please check your .env file");
}
class MCPXeroClient extends XeroClient {
    tenantId;
    shortCode;
    constructor(config) {
        super(config);
        this.tenantId = "";
        this.shortCode = "";
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async updateTenants(fullOrgDetails) {
        await super.updateTenants(fullOrgDetails);
        if (this.tenants && this.tenants.length > 0) {
            this.tenantId = this.tenants[0].tenantId;
        }
        return this.tenants;
    }
    async getOrganisation() {
        await this.authenticate();
        const organisationResponse = await this.accountingApi.getOrganisations(this.tenantId || "");
        const organisation = organisationResponse.body.organisations?.[0];
        if (!organisation) {
            throw new Error("Failed to retrieve organisation");
        }
        return organisation;
    }
    async getShortCode() {
        if (!this.shortCode) {
            try {
                const organisation = await this.getOrganisation();
                this.shortCode = organisation.shortCode ?? "";
            }
            catch (error) {
                const err = ensureError(error);
                throw new Error(`Failed to get Organisation short code: ${err.message}`);
            }
        }
        return this.shortCode;
    }
}
class CustomConnectionsXeroClient extends MCPXeroClient {
    clientId;
    clientSecret;
    constructor(config) {
        super(config);
        this.clientId = config.clientId;
        this.clientSecret = config.clientSecret;
    }
    async getClientCredentialsToken() {
        const scope = "accounting.transactions accounting.contacts accounting.settings accounting.reports.read payroll.settings payroll.employees payroll.timesheets";
        const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");
        try {
            const response = await axios.post("https://identity.xero.com/connect/token", `grant_type=client_credentials&scope=${encodeURIComponent(scope)}`, {
                headers: {
                    Authorization: `Basic ${credentials}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                    Accept: "application/json",
                },
            });
            // Get the tenant ID from the connections endpoint
            const token = response.data.access_token;
            const connectionsResponse = await axios.get("https://api.xero.com/connections", {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
            });
            if (connectionsResponse.data && connectionsResponse.data.length > 0) {
                this.tenantId = connectionsResponse.data[0].tenantId;
            }
            return response.data;
        }
        catch (error) {
            const axiosError = error;
            throw new Error(`Failed to get Xero token: ${axiosError.response?.data || axiosError.message}`);
        }
    }
    async authenticate() {
        const tokenResponse = await this.getClientCredentialsToken();
        this.setTokenSet({
            access_token: tokenResponse.access_token,
            expires_in: tokenResponse.expires_in,
            token_type: tokenResponse.token_type,
        });
    }
}
class BearerTokenXeroClient extends MCPXeroClient {
    bearerToken;
    constructor(config) {
        super();
        this.bearerToken = config.bearerToken;
    }
    async authenticate() {
        this.setTokenSet({
            access_token: this.bearerToken,
        });
        await this.updateTenants();
    }
}
export const xeroClient = bearer_token
    ? new BearerTokenXeroClient({
        bearerToken: bearer_token,
    })
    : new CustomConnectionsXeroClient({
        clientId: client_id,
        clientSecret: client_secret,
        grantType: grant_type,
    });

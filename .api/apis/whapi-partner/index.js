"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var oas_1 = __importDefault(require("oas"));
var core_1 = __importDefault(require("api/dist/core"));
var openapi_json_1 = __importDefault(require("./openapi.json"));
var SDK = /** @class */ (function () {
    function SDK() {
        this.spec = oas_1.default.init(openapi_json_1.default);
        this.core = new core_1.default(this.spec, 'whapi-partner/0.1.1 (api/6.1.2)');
    }
    /**
     * Optionally configure various options that the SDK allows.
     *
     * @param config Object of supported SDK options and toggles.
     * @param config.timeout Override the default `fetch` request timeout of 30 seconds. This number
     * should be represented in milliseconds.
     */
    SDK.prototype.config = function (config) {
        this.core.setConfig(config);
    };
    /**
     * If the API you're using requires authentication you can supply the required credentials
     * through this method and the library will magically determine how they should be used
     * within your API request.
     *
     * With the exception of OpenID and MutualTLS, it supports all forms of authentication
     * supported by the OpenAPI specification.
     *
     * @example <caption>HTTP Basic auth</caption>
     * sdk.auth('username', 'password');
     *
     * @example <caption>Bearer tokens (HTTP or OAuth 2)</caption>
     * sdk.auth('myBearerToken');
     *
     * @example <caption>API Keys</caption>
     * sdk.auth('myApiKey');
     *
     * @see {@link https://spec.openapis.org/oas/v3.0.3#fixed-fields-22}
     * @see {@link https://spec.openapis.org/oas/v3.1.0#fixed-fields-22}
     * @param values Your auth credentials for the API; can specify up to two strings or numbers.
     */
    SDK.prototype.auth = function () {
        var _a;
        var values = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            values[_i] = arguments[_i];
        }
        (_a = this.core).setAuth.apply(_a, values);
        return this;
    };
    /**
     * If the API you're using offers alternate server URLs, and server variables, you can tell
     * the SDK which one to use with this method. To use it you can supply either one of the
     * server URLs that are contained within the OpenAPI definition (along with any server
     * variables), or you can pass it a fully qualified URL to use (that may or may not exist
     * within the OpenAPI definition).
     *
     * @example <caption>Server URL with server variables</caption>
     * sdk.server('https://{region}.api.example.com/{basePath}', {
     *   name: 'eu',
     *   basePath: 'v14',
     * });
     *
     * @example <caption>Fully qualified server URL</caption>
     * sdk.server('https://eu.api.example.com/v14');
     *
     * @param url Server URL
     * @param variables An object of variables to replace into the server URL.
     */
    SDK.prototype.server = function (url, variables) {
        if (variables === void 0) { variables = {}; }
        this.core.setServer(url, variables);
    };
    /**
     * ✅ Create channel
     *
     * @throws FetchError<400, types.CreateChannelResponse400> Wrong request parameters
     * @throws FetchError<404, types.CreateChannelResponse404> Specified project not found
     * @throws FetchError<500, types.CreateChannelResponse500> Internal Error
     * @throws FetchError<503, types.CreateChannelResponse503> All servers are currently busy. Please try again later
     */
    SDK.prototype.createChannel = function (body) {
        return this.core.fetch('/channels', 'put', body);
    };
    /**
     * Get channels
     *
     * @throws FetchError<400, types.GetChannelsResponse400> Wrong request parameters
     * @throws FetchError<500, types.GetChannelsResponse500> Internal Error
     */
    SDK.prototype.getChannels = function (metadata) {
        return this.core.fetch('/channels/list', 'get', metadata);
    };
    /**
     * Get channels
     *
     * @throws FetchError<400, types.GetChannelsByProjectIdResponse400> Wrong request parameters
     * @throws FetchError<404, types.GetChannelsByProjectIdResponse404> Specified project not found
     * @throws FetchError<500, types.GetChannelsByProjectIdResponse500> Internal Error
     */
    SDK.prototype.getChannelsByProjectID = function (metadata) {
        return this.core.fetch('/channels/list/{ProjectID}', 'get', metadata);
    };
    /**
     * Get channel
     *
     * @throws FetchError<400, types.GetChannelResponse400> Wrong request parameters
     * @throws FetchError<404, types.GetChannelResponse404> Specified channel not found
     * @throws FetchError<500, types.GetChannelResponse500> Internal Error
     */
    SDK.prototype.getChannel = function (metadata) {
        return this.core.fetch('/channels/{ChannelID}', 'get', metadata);
    };
    /**
     * ❌ Delete channel
     *
     * @throws FetchError<400, types.DeleteChannelResponse400> Wrong request parameters
     * @throws FetchError<404, types.DeleteChannelResponse404> Specified channel not found
     * @throws FetchError<500, types.DeleteChannelResponse500> Internal Error
     */
    SDK.prototype.deleteChannel = function (metadata) {
        return this.core.fetch('/channels/{ChannelID}', 'delete', metadata);
    };
    /**
     * Update channel
     *
     * @throws FetchError<400, types.UpdateChannelResponse400> Wrong request parameters
     * @throws FetchError<404, types.UpdateChannelResponse404> Specified channel not found
     * @throws FetchError<500, types.UpdateChannelResponse500> Internal Error
     */
    SDK.prototype.updateChannel = function (body, metadata) {
        return this.core.fetch('/channels/{ChannelID}', 'patch', body, metadata);
    };
    /**
     * ▶ Start channel
     *
     * @throws FetchError<400, types.StartChannelResponse400> Wrong request parameters
     * @throws FetchError<404, types.StartChannelResponse404> Specified channel not found
     * @throws FetchError<500, types.StartChannelResponse500> Internal Error
     * @throws FetchError<503, types.StartChannelResponse503> The channel is not ready to be started
     */
    SDK.prototype.startChannel = function (metadata) {
        return this.core.fetch('/channels/{ChannelID}/start', 'post', metadata);
    };
    SDK.prototype.stopChannel = function (body, metadata) {
        return this.core.fetch('/channels/{ChannelID}/stop', 'post', body, metadata);
    };
    /**
     * 🔄 Restart channel
     *
     * @throws FetchError<400, types.RestartChannelResponse400> Wrong request parameters
     * @throws FetchError<404, types.RestartChannelResponse404> Specified channel not found
     * @throws FetchError<500, types.RestartChannelResponse500> Internal Error
     * @throws FetchError<503, types.RestartChannelResponse503> The channel is not ready to be restarted
     */
    SDK.prototype.restartChannel = function (metadata) {
        return this.core.fetch('/channels/{ChannelID}/restart', 'post', metadata);
    };
    /**
     * Extend channel
     *
     * @throws FetchError<400, types.ExtendChannelResponse400> Wrong request parameters
     * @throws FetchError<404, types.ExtendChannelResponse404> Specified channel not found
     * @throws FetchError<500, types.ExtendChannelResponse500> Internal Error
     * @throws FetchError<503, types.ExtendChannelResponse503> Error
     */
    SDK.prototype.extendChannel = function (body, metadata) {
        return this.core.fetch('/channels/{ChannelID}/extend', 'post', body, metadata);
    };
    SDK.prototype.changeChannelMode = function (body, metadata) {
        return this.core.fetch('/channels/{ChannelID}/mode', 'patch', body, metadata);
    };
    /**
     * Get projects
     *
     * @throws FetchError<400, types.GetProjectsResponse400> Wrong request parameters
     * @throws FetchError<500, types.GetProjectsResponse500> Internal Error
     */
    SDK.prototype.getProjects = function (metadata) {
        return this.core.fetch('/projects', 'get', metadata);
    };
    /**
     * ✅ Create project
     *
     * @throws FetchError<400, types.CreateProjectResponse400> Wrong request parameters
     * @throws FetchError<500, types.CreateProjectResponse500> Internal Error
     */
    SDK.prototype.createProject = function (body) {
        return this.core.fetch('/projects', 'put', body);
    };
    /**
     * Get project
     *
     * @throws FetchError<400, types.GetProjectResponse400> Wrong request parameters
     * @throws FetchError<404, types.GetProjectResponse404> Specified project not found
     * @throws FetchError<500, types.GetProjectResponse500> Internal Error
     */
    SDK.prototype.getProject = function (metadata) {
        return this.core.fetch('/projects/{ProjectID}', 'get', metadata);
    };
    /**
     * ❌ Delete project
     *
     * @throws FetchError<400, types.DeleteProjectResponse400> Wrong request parameters
     * @throws FetchError<404, types.DeleteProjectResponse404> Specified project not found
     * @throws FetchError<500, types.DeleteProjectResponse500> Internal Error
     */
    SDK.prototype.deleteProject = function (metadata) {
        return this.core.fetch('/projects/{ProjectID}', 'delete', metadata);
    };
    /**
     * Update project
     *
     * @throws FetchError<400, types.UpdateProjectResponse400> Wrong request parameters
     * @throws FetchError<404, types.UpdateProjectResponse404> Specified project not found
     * @throws FetchError<500, types.UpdateProjectResponse500> Internal Error
     */
    SDK.prototype.updateProject = function (body, metadata) {
        return this.core.fetch('/projects/{ProjectID}', 'patch', body, metadata);
    };
    /**
     * Get partner settings
     *
     * @throws FetchError<400, types.GetPartnerSettingsResponse400> Wrong request parameters
     * @throws FetchError<403, types.GetPartnerSettingsResponse403> Forbidden
     * @throws FetchError<500, types.GetPartnerSettingsResponse500> Internal Error
     */
    SDK.prototype.getPartnerSettings = function (metadata) {
        return this.core.fetch('/partners/{PartnerName}/settings', 'get', metadata);
    };
    SDK.prototype.setPartnerSettings = function (body, metadata) {
        return this.core.fetch('/partners/{PartnerName}/settings', 'patch', body, metadata);
    };
    return SDK;
}());
var createSDK = (function () { return new SDK(); })();
module.exports = createSDK;

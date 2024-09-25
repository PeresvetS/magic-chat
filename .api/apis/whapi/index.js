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
        this.core = new core_1.default(this.spec, 'whapi/1.8.7 (api/6.1.2)');
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
     * Allows you to track and get feedback on the operational status of the whapi channel
     * (instance). An instance is a connection with a phone number that has a WhatsApp account,
     * which will be responsible for sending and receiving messages
     *
     * @summary Check health & launch channel
     * @throws FetchError<500, types.CheckHealthResponse500> Internal Error
     */
    SDK.prototype.checkHealth = function (metadata) {
        return this.core.fetch('/health', 'get', metadata);
    };
    /**
     * Get channel settings
     *
     * @throws FetchError<500, types.GetChannelSettingsResponse500> Internal Error
     */
    SDK.prototype.getChannelSettings = function (body) {
        return this.core.fetch('/settings', 'get', body);
    };
    /**
     * Reset channel settings
     *
     * @throws FetchError<409, types.ResetChannelSettingsResponse409> Settings already reset
     * @throws FetchError<500, types.ResetChannelSettingsResponse500> Internal Error
     */
    SDK.prototype.resetChannelSettings = function () {
        return this.core.fetch('/settings', 'delete');
    };
    /**
     * If a field is not present in the request, no change is made to that setting. For
     * example, if 'proxy' is not sent with the request, the existing configuration for 'proxy'
     * is unchanged.
     *
     * @summary Update channel settings
     * @throws FetchError<400, types.UpdateChannelSettingsResponse400> Wrong settings format
     * @throws FetchError<500, types.UpdateChannelSettingsResponse500> Internal Error
     */
    SDK.prototype.updateChannelSettings = function (body) {
        return this.core.fetch('/settings', 'patch', body);
    };
    /**
     * Get a list of specific events that you can be notified about when Webhook is configured
     *
     * @summary Get allowed events
     * @throws FetchError<500, types.GetAllowedEventsResponse500> Internal Error
     */
    SDK.prototype.getAllowedEvents = function () {
        return this.core.fetch('/settings/events', 'get');
    };
    /**
     * For testing webhook.
     *
     * @summary Test webhook
     * @throws FetchError<400, types.WebhookTestResponse400> Wrong parameters
     * @throws FetchError<500, types.WebhookTestResponse500> Internal Error
     */
    SDK.prototype.webhookTest = function (body) {
        return this.core.fetch('/settings/webhook_test', 'post', body);
    };
    /**
     * This method returns an image of the type base64. You can render this in a component of
     * the type image that is compatible with the language that you use to program. Just like
     * on WhatsApp Web you will need to read a QR code to connect to Whapi.Cloud. There are two
     * ways that you can do the reading of the QR code. Connect through our dashboard panel or
     * Make this experience available within your own application.
     *
     * @summary Login user with QR-base64
     * @throws FetchError<406, types.LoginUserResponse406> Not acceptable for mobile type channel
     * @throws FetchError<409, types.LoginUserResponse409> Channel already authenticated
     * @throws FetchError<422, types.LoginUserResponse422> Render QR failed
     * @throws FetchError<500, types.LoginUserResponse500> Internal Error
     */
    SDK.prototype.loginUser = function (body, metadata) {
        return this.core.fetch('/users/login', 'get', body, metadata);
    };
    /**
     * This method returns an image. Just like on WhatsApp Web you will need to read a QR code
     * to connect to Whapi.Cloud. There are two ways that you can do the reading of the QR
     * code. Connect through our dashboard panel or Make this experience available within your
     * own application.
     *
     * @summary Login user with QR-image
     * @throws FetchError<500, types.LoginUserImageResponse500> Internal Error
     */
    SDK.prototype.loginUserImage = function (body, metadata) {
        return this.core.fetch('/users/login/image', 'get', body, metadata);
    };
    /**
     * Login user with QR-rowdata
     *
     * @throws FetchError<406, types.LoginUserRowDataResponse406> Not acceptable for mobile type channel
     * @throws FetchError<409, types.LoginUserRowDataResponse409> Channel already authenticated
     * @throws FetchError<500, types.LoginUserRowDataResponse500> Internal Error
     */
    SDK.prototype.loginUserRowData = function (metadata) {
        return this.core.fetch('/users/login/rowdata', 'get', metadata);
    };
    /**
     * This method returns a code that allows you to connect the phone number to the API
     * without the need to scan a QR code, simply by entering the generated code.
     *
     * @summary Get auth code by phone number
     * @throws FetchError<400, types.LoginUserViaAuthCodeResponse400> Invalid phone number
     * @throws FetchError<406, types.LoginUserViaAuthCodeResponse406> Not acceptable for mobile type channel
     * @throws FetchError<409, types.LoginUserViaAuthCodeResponse409> Channel already authenticated
     * @throws FetchError<422, types.LoginUserViaAuthCodeResponse422> Render QR failed
     * @throws FetchError<500, types.LoginUserViaAuthCodeResponse500> Internal Error
     */
    SDK.prototype.loginUserViaAuthCode = function (metadata) {
        return this.core.fetch('/users/login/{PhoneNumber}', 'get', metadata);
    };
    /**
     * Allows you to register a number on WhatsApp. Requires mandatory use of mobile proxies!
     *
     * @summary Login in whatsapp with phone number
     * @throws FetchError<400, types.LoginUserViaMobileResponse400> Invalid phone number
     * @throws FetchError<403, types.LoginUserViaMobileResponse403> Forbidden without a proxy
     * @throws FetchError<406, types.LoginUserViaMobileResponse406> Acceptable only for mobile type channel
     * @throws FetchError<409, types.LoginUserViaMobileResponse409> Channel already authenticated
     * @throws FetchError<412, types.LoginUserViaMobileResponse412> A different phone number has been provided. To authorize with a new number, please
     * logout and initiate mobile login process again
     * @throws FetchError<422, types.LoginUserViaMobileResponse422> Render QR failed
     * @throws FetchError<500, types.LoginUserViaMobileResponse500> Internal Error
     */
    SDK.prototype.loginUserViaMobile = function (body) {
        return this.core.fetch('/users/login/mobile', 'post', body);
    };
    /**
     * Logout user
     *
     * @throws FetchError<409, types.LogoutUserResponse409> Channel already logged out
     * @throws FetchError<500, types.LogoutUserResponse500> Internal Error
     */
    SDK.prototype.logoutUser = function () {
        return this.core.fetch('/users/logout', 'post');
    };
    /**
     * The method allows you to get information about your WhatsApp profile
     *
     * @summary User info
     * @throws FetchError<500, types.GetUserProfileResponse500> Internal Error
     */
    SDK.prototype.getUserProfile = function () {
        return this.core.fetch('/users/profile', 'get');
    };
    /**
     * This method is responsible for changing the details of your WhatsApp profile
     *
     * @summary Update user info
     * @throws FetchError<500, types.UpdateUserProfileResponse500> Internal Error
     */
    SDK.prototype.updateUserProfile = function (body) {
        return this.core.fetch('/users/profile', 'patch', body);
    };
    /**
     * The method contains a list of all received and sent messages in a particular chat.
     * Sorting by descending date of message sending.
     *
     * @summary Get messages
     * @throws FetchError<400, types.GetMessagesResponse400> Wrong request parameters
     * @throws FetchError<500, types.GetMessagesResponse500> Internal Error
     */
    SDK.prototype.getMessages = function (metadata) {
        return this.core.fetch('/messages/list', 'get', metadata);
    };
    /**
     * The method contains a list of all received and sent messages in a particular chat.
     * Sorting by descending date of message sending. You will need to specify [Chat
     * ID](https://support.whapi.cloud/help-desk/faq/chat-id.-what-is-it-and-how-to-get-it)
     *
     * @summary Get messages by chat ID
     * @throws FetchError<400, types.GetMessagesByChatIdResponse400> Wrong request parameters
     * @throws FetchError<404, types.GetMessagesByChatIdResponse404> Specified chat not found
     * @throws FetchError<500, types.GetMessagesByChatIdResponse500> Internal Error
     */
    SDK.prototype.getMessagesByChatID = function (metadata) {
        return this.core.fetch('/messages/list/{ChatID}', 'get', metadata);
    };
    /**
     * This endpoint will let you send messages to any WhatsApp-enabled phone number or to any
     * WhatsApp Group/Channel using your own number connected to Whapi.Cloud. Follow the
     * instructions if you want to [format
     * text](https://support.whapi.cloud/help-desk/faq/whatsapp-text-formatting), [send a
     * emoji](https://support.whapi.cloud/help-desk/sending/send-emoji) or [use line
     * breaks](https://support.whapi.cloud/help-desk/faq/how-to-send-a-paragraph-line-break).
     *
     * @summary 💬 Send text message
     * @throws FetchError<400, types.SendMessageTextResponse400> Wrong request parameters
     * @throws FetchError<401, types.SendMessageTextResponse401> Need channel authorization for send message
     * @throws FetchError<402, types.SendMessageTextResponse402> Trial version limit exceeded
     * @throws FetchError<403, types.SendMessageTextResponse403> It is forbidden to send to this group/recipient
     * @throws FetchError<413, types.SendMessageTextResponse413> Request body too large
     * @throws FetchError<429, types.SendMessageTextResponse429> Too many requests
     * @throws FetchError<500, types.SendMessageTextResponse500> Internal Error
     */
    SDK.prototype.sendMessageText = function (body) {
        return this.core.fetch('/messages/text', 'post', body);
    };
    /**
     * This method is responsible for sending images for chats. The requirements for [sending
     * all media types are
     * identical](https://support.whapi.cloud/help-desk/sending/send-video-audio-image-document)
     *
     * @summary 🖼 Send media-image message
     * @throws FetchError<400, types.SendMessageImageResponse400> Wrong request parameters
     * @throws FetchError<401, types.SendMessageImageResponse401> Need channel authorization for send message
     * @throws FetchError<402, types.SendMessageImageResponse402> Trial version limit exceeded
     * @throws FetchError<403, types.SendMessageImageResponse403> It is forbidden to send to this group/recipient
     * @throws FetchError<404, types.SendMessageImageResponse404> Media with specified id not found
     * @throws FetchError<413, types.SendMessageImageResponse413> Request media too large
     * @throws FetchError<415, types.SendMessageImageResponse415> Unsupported media type
     * @throws FetchError<429, types.SendMessageImageResponse429> Too many requests
     * @throws FetchError<500, types.SendMessageImageResponse500> Internal Error
     */
    SDK.prototype.sendMessageImage = function (body) {
        return this.core.fetch('/messages/image', 'post', body);
    };
    /**
     * This method is responsible for sending a video message for chats. The requirements for
     * [sending all media types are
     * identical](https://support.whapi.cloud/help-desk/sending/send-video-audio-image-document)
     *
     * @summary 🎥 Send media-video message
     * @throws FetchError<400, types.SendMessageVideoResponse400> Wrong request parameters
     * @throws FetchError<401, types.SendMessageVideoResponse401> Need channel authorization for send message
     * @throws FetchError<402, types.SendMessageVideoResponse402> Trial version limit exceeded
     * @throws FetchError<403, types.SendMessageVideoResponse403> It is forbidden to send to this group/recipient
     * @throws FetchError<404, types.SendMessageVideoResponse404> Media with specified id not found
     * @throws FetchError<413, types.SendMessageVideoResponse413> Request media too large
     * @throws FetchError<415, types.SendMessageVideoResponse415> Unsupported media type
     * @throws FetchError<429, types.SendMessageVideoResponse429> Too many requests
     * @throws FetchError<500, types.SendMessageVideoResponse500> Internal Error
     */
    SDK.prototype.sendMessageVideo = function (body) {
        return this.core.fetch('/messages/video', 'post', body);
    };
    /**
     * This method is responsible for sending a short video in the circle for chats. The
     * requirements for [sending all media types are
     * identical](https://support.whapi.cloud/help-desk/sending/send-video-audio-image-document)
     *
     * @summary 📹 Send media-short video message (PTV)
     * @throws FetchError<400, types.SendMessageShortResponse400> Wrong request parameters
     * @throws FetchError<401, types.SendMessageShortResponse401> Need channel authorization for send message
     * @throws FetchError<402, types.SendMessageShortResponse402> Trial version limit exceeded
     * @throws FetchError<403, types.SendMessageShortResponse403> It is forbidden to send to this group/recipient
     * @throws FetchError<404, types.SendMessageShortResponse404> Media with specified id not found
     * @throws FetchError<413, types.SendMessageShortResponse413> Request media too large
     * @throws FetchError<415, types.SendMessageShortResponse415> Unsupported media type
     * @throws FetchError<429, types.SendMessageShortResponse429> Too many requests
     * @throws FetchError<500, types.SendMessageShortResponse500> Internal Error
     */
    SDK.prototype.sendMessageShort = function (body) {
        return this.core.fetch('/messages/short', 'post', body);
    };
    /**
     * Method responsible for sending GIFs to your chats through the API (The file to be sent
     * must be an MP4)
     *
     * @summary 🎬 Send media-gif message
     * @throws FetchError<400, types.SendMessageGifResponse400> Wrong request parameters
     * @throws FetchError<401, types.SendMessageGifResponse401> Need channel authorization for send message
     * @throws FetchError<402, types.SendMessageGifResponse402> Trial version limit exceeded
     * @throws FetchError<403, types.SendMessageGifResponse403> It is forbidden to send to this group/recipient
     * @throws FetchError<404, types.SendMessageGifResponse404> Media with specified id not found
     * @throws FetchError<413, types.SendMessageGifResponse413> Request media too large
     * @throws FetchError<415, types.SendMessageGifResponse415> Unsupported media type
     * @throws FetchError<429, types.SendMessageGifResponse429> Too many requests
     * @throws FetchError<500, types.SendMessageGifResponse500> Internal Error
     */
    SDK.prototype.sendMessageGif = function (body) {
        return this.core.fetch('/messages/gif', 'post', body);
    };
    /**
     * This method is responsible for sending audio messages for chats. The requirements for
     * [sending all media types are
     * identical](https://support.whapi.cloud/help-desk/sending/send-video-audio-image-document)
     *
     * @summary 🎵 Send media-audio message
     * @throws FetchError<400, types.SendMessageAudioResponse400> Wrong request parameters
     * @throws FetchError<401, types.SendMessageAudioResponse401> Need channel authorization for send message
     * @throws FetchError<402, types.SendMessageAudioResponse402> Trial version limit exceeded
     * @throws FetchError<403, types.SendMessageAudioResponse403> It is forbidden to send to this group/recipient
     * @throws FetchError<404, types.SendMessageAudioResponse404> Media with specified id not found
     * @throws FetchError<413, types.SendMessageAudioResponse413> Request media too large
     * @throws FetchError<415, types.SendMessageAudioResponse415> Unsupported media type
     * @throws FetchError<429, types.SendMessageAudioResponse429> Too many requests
     * @throws FetchError<500, types.SendMessageAudioResponse500> Internal Error
     */
    SDK.prototype.sendMessageAudio = function (body) {
        return this.core.fetch('/messages/audio', 'post', body);
    };
    /**
     * This method is responsible for sending a voice message for chats. The requirements for
     * [sending all media types are
     * identical](https://support.whapi.cloud/help-desk/sending/send-video-audio-image-document).
     * However, there are [some
     * nuances](https://support.whapi.cloud/help-desk/sending/overview-of-other-methods-for-sending/send-voice-message)
     * when sending voice messages
     *
     * @summary 🎤 Send media-voice message
     * @throws FetchError<400, types.SendMessageVoiceResponse400> Wrong request parameters
     * @throws FetchError<401, types.SendMessageVoiceResponse401> Need channel authorization for send message
     * @throws FetchError<402, types.SendMessageVoiceResponse402> Trial version limit exceeded
     * @throws FetchError<403, types.SendMessageVoiceResponse403> It is forbidden to send to this group/recipient
     * @throws FetchError<404, types.SendMessageVoiceResponse404> Media with specified id not found
     * @throws FetchError<413, types.SendMessageVoiceResponse413> Request media too large
     * @throws FetchError<415, types.SendMessageVoiceResponse415> Unsupported media type
     * @throws FetchError<429, types.SendMessageVoiceResponse429> Too many requests
     * @throws FetchError<500, types.SendMessageVoiceResponse500> Internal Error
     */
    SDK.prototype.sendMessageVoice = function (body) {
        return this.core.fetch('/messages/voice', 'post', body);
    };
    /**
     * This method is responsible for sending documents for chats. The requirements for
     * [sending all media types are
     * identical](https://support.whapi.cloud/help-desk/sending/send-video-audio-image-document)
     *
     * @summary 📑 Send media-document message
     * @throws FetchError<400, types.SendMessageDocumentResponse400> Wrong request parameters
     * @throws FetchError<401, types.SendMessageDocumentResponse401> Need channel authorization for send message
     * @throws FetchError<402, types.SendMessageDocumentResponse402> Trial version limit exceeded
     * @throws FetchError<403, types.SendMessageDocumentResponse403> It is forbidden to send to this group/recipient
     * @throws FetchError<404, types.SendMessageDocumentResponse404> Media with specified id not found
     * @throws FetchError<413, types.SendMessageDocumentResponse413> Request media too large
     * @throws FetchError<415, types.SendMessageDocumentResponse415> Unsupported media type
     * @throws FetchError<429, types.SendMessageDocumentResponse429> Too many requests
     * @throws FetchError<500, types.SendMessageDocumentResponse500> Internal Error
     */
    SDK.prototype.sendMessageDocument = function (body) {
        return this.core.fetch('/messages/document', 'post', body);
    };
    /**
     * Method responsible for sending links with customize preview to your contacts, it is used
     * to share links so that the user can be redirected to a website. Your link must
     * necessarily be in the Body parameter. It is important for you to know that [the link is
     * only
     * clickable](https://support.whapi.cloud/help-desk/faq/inactive-links-in-whatsapp-messages)
     * if the recipient already has your phone number in their contacts, or if they start a
     * conversation with you
     *
     * @summary 📎 Send link preview message
     * @throws FetchError<400, types.SendMessageLinkPreviewResponse400> Wrong request parameters
     * @throws FetchError<401, types.SendMessageLinkPreviewResponse401> Need channel authorization for send message
     * @throws FetchError<402, types.SendMessageLinkPreviewResponse402> Trial version limit exceeded
     * @throws FetchError<403, types.SendMessageLinkPreviewResponse403> It is forbidden to send to this group/recipient
     * @throws FetchError<404, types.SendMessageLinkPreviewResponse404> Media with specified id not found
     * @throws FetchError<413, types.SendMessageLinkPreviewResponse413> Request media too large
     * @throws FetchError<415, types.SendMessageLinkPreviewResponse415> Unsupported media type
     * @throws FetchError<429, types.SendMessageLinkPreviewResponse429> Too many requests
     * @throws FetchError<500, types.SendMessageLinkPreviewResponse500> Internal Error
     */
    SDK.prototype.sendMessageLinkPreview = function (body) {
        return this.core.fetch('/messages/link_preview', 'post', body);
    };
    /**
     * Method responsible for sending a fixed location to your contacts, it is mostly used to
     * send an address’s location
     *
     * @summary 📍 Send location message
     * @throws FetchError<400, types.SendMessageLocationResponse400> Wrong request parameters
     * @throws FetchError<401, types.SendMessageLocationResponse401> Need channel authorization for send message
     * @throws FetchError<402, types.SendMessageLocationResponse402> Trial version limit exceeded
     * @throws FetchError<403, types.SendMessageLocationResponse403> It is forbidden to send to this group/recipient
     * @throws FetchError<413, types.SendMessageLocationResponse413> Request body too large
     * @throws FetchError<429, types.SendMessageLocationResponse429> Too many requests
     * @throws FetchError<500, types.SendMessageLocationResponse500> Internal Error
     */
    SDK.prototype.sendMessageLocation = function (body) {
        return this.core.fetch('/messages/location', 'post', body);
    };
    /**
     * 🧭 Send live location message
     *
     * @throws FetchError<400, types.SendMessageLiveLocationResponse400> Wrong request parameters
     * @throws FetchError<401, types.SendMessageLiveLocationResponse401> Need channel authorization for send message
     * @throws FetchError<402, types.SendMessageLiveLocationResponse402> Trial version limit exceeded
     * @throws FetchError<403, types.SendMessageLiveLocationResponse403> It is forbidden to send to this group/recipient
     * @throws FetchError<413, types.SendMessageLiveLocationResponse413> Request body too large
     * @throws FetchError<429, types.SendMessageLiveLocationResponse429> Too many requests
     * @throws FetchError<500, types.SendMessageLiveLocationResponse500> Internal Error
     */
    SDK.prototype.sendMessageLiveLocation = function (body) {
        return this.core.fetch('/messages/live_location', 'post', body);
    };
    /**
     * Simple and object, this method allows you to send a contact. You don't need to have it
     * added to your contacts list, all you have to do is fill in the method attributes with
     * the contact information and send. [A few ready
     * examples](https://support.whapi.cloud/help-desk/sending/overview-of-other-methods-for-sending/send-contact-vcard)
     *
     * @summary 👤 Send contact message
     * @throws FetchError<400, types.SendMessageContactResponse400> Wrong request parameters
     * @throws FetchError<401, types.SendMessageContactResponse401> Need channel authorization for send message
     * @throws FetchError<402, types.SendMessageContactResponse402> Trial version limit exceeded
     * @throws FetchError<403, types.SendMessageContactResponse403> It is forbidden to send to this group/recipient
     * @throws FetchError<413, types.SendMessageContactResponse413> Request body too large
     * @throws FetchError<429, types.SendMessageContactResponse429> Too many requests
     * @throws FetchError<500, types.SendMessageContactResponse500> Internal Error
     */
    SDK.prototype.sendMessageContact = function (body) {
        return this.core.fetch('/messages/contact', 'post', body);
    };
    /**
     * Simple and straightforward, this method allows you to send multiple contacts. You don't
     * need to have them in your contacts; just fill the method's attributes with the contact
     * information and send. [A few ready
     * examples](https://support.whapi.cloud/help-desk/sending/overview-of-other-methods-for-sending/send-contact-vcard)
     *
     * @summary 👥 Send contact list message
     * @throws FetchError<400, types.SendMessageContactListResponse400> Wrong request parameters
     * @throws FetchError<401, types.SendMessageContactListResponse401> Need channel authorization for send message
     * @throws FetchError<402, types.SendMessageContactListResponse402> Trial version limit exceeded
     * @throws FetchError<403, types.SendMessageContactListResponse403> It is forbidden to send to this group/recipient
     * @throws FetchError<413, types.SendMessageContactListResponse413> Request body too large
     * @throws FetchError<429, types.SendMessageContactListResponse429> Too many requests
     * @throws FetchError<500, types.SendMessageContactListResponse500> Internal Error
     */
    SDK.prototype.sendMessageContactList = function (body) {
        return this.core.fetch('/messages/contact_list', 'post', body);
    };
    /**
     * In this method, you can send poll-type messages. Often, it's the polls that replace [the
     * buttons for interactive
     * communication](https://support.whapi.cloud/help-desk/hints/how-to-use-polls-as-buttons)
     *
     * @summary 📊 Send poll message
     * @throws FetchError<400, types.SendMessagePollResponse400> Wrong request parameters
     * @throws FetchError<401, types.SendMessagePollResponse401> Need channel authorization for send message
     * @throws FetchError<402, types.SendMessagePollResponse402> Trial version limit exceeded
     * @throws FetchError<403, types.SendMessagePollResponse403> It is forbidden to send to this group/recipient
     * @throws FetchError<429, types.SendMessagePollResponse429> Too many requests
     * @throws FetchError<500, types.SendMessagePollResponse500> Internal Error
     */
    SDK.prototype.sendMessagePoll = function (body) {
        return this.core.fetch('/messages/poll', 'post', body);
    };
    /**
     * This endpoint is responsible for sending messages with buttons. The section is
     * constantly updated as the functionality of buttons depends on WhatsApp updates. Button
     * sending is currently available. For more information, please visit the [Button Status
     * topic](https://support.whapi.cloud/help-desk/faq/current-status-of-buttons-on-whatsapp).
     *
     * @summary 🎮 Send interactive message
     * @throws FetchError<400, types.SendMessageInteractiveResponse400> Wrong request parameters
     * @throws FetchError<401, types.SendMessageInteractiveResponse401> Need channel authorization for send message
     * @throws FetchError<402, types.SendMessageInteractiveResponse402> Trial version limit exceeded
     * @throws FetchError<403, types.SendMessageInteractiveResponse403> It is forbidden to send to this group/recipient
     * @throws FetchError<404, types.SendMessageInteractiveResponse404> Media with specified id not found
     * @throws FetchError<413, types.SendMessageInteractiveResponse413> Request media too large
     * @throws FetchError<415, types.SendMessageInteractiveResponse415> Unsupported media type
     * @throws FetchError<429, types.SendMessageInteractiveResponse429> Too many requests
     * @throws FetchError<500, types.SendMessageInteractiveResponse500> Internal Error
     */
    SDK.prototype.sendMessageInteractive = function (body) {
        return this.core.fetch('/messages/interactive', 'post', body);
    };
    /**
     * This method is responsible for sending a sticker message for chats. The requirements for
     * [sending all media types are
     * identical](https://support.whapi.cloud/help-desk/sending/send-video-audio-image-document)
     *
     * @summary 🎭 Send media-sticker message
     * @throws FetchError<400, types.SendMessageStickerResponse400> Wrong request parameters
     * @throws FetchError<401, types.SendMessageStickerResponse401> Need channel authorization for send message
     * @throws FetchError<402, types.SendMessageStickerResponse402> Trial version limit exceeded
     * @throws FetchError<403, types.SendMessageStickerResponse403> It is forbidden to send to this group/recipient
     * @throws FetchError<404, types.SendMessageStickerResponse404> Media with specified id not found
     * @throws FetchError<413, types.SendMessageStickerResponse413> Request media too large
     * @throws FetchError<415, types.SendMessageStickerResponse415> Unsupported media type
     * @throws FetchError<429, types.SendMessageStickerResponse429> Too many requests
     * @throws FetchError<500, types.SendMessageStickerResponse500> Internal Error
     */
    SDK.prototype.sendMessageSticker = function (body) {
        return this.core.fetch('/messages/sticker', 'post', body);
    };
    /**
     * The method responsible for sending images or texts to your status. Remember that
     * statuses disappear after 24 hours. The requirements for [sending all media types are
     * identical](https://support.whapi.cloud/help-desk/sending/send-video-audio-image-document)
     *
     * @summary 👁️‍🗨️ Send story message
     * @throws FetchError<400, types.SendMessageStoryResponse400> Wrong request parameters
     * @throws FetchError<401, types.SendMessageStoryResponse401> Need channel authorization for posting stories
     * @throws FetchError<402, types.SendMessageStoryResponse402> Trial version limit exceeded
     * @throws FetchError<403, types.SendMessageStoryResponse403> It is forbidden to send to this group/recipient
     * @throws FetchError<404, types.SendMessageStoryResponse404> Media with specified id not found
     * @throws FetchError<413, types.SendMessageStoryResponse413> Request media too large
     * @throws FetchError<415, types.SendMessageStoryResponse415> Unsupported media type
     * @throws FetchError<429, types.SendMessageStoryResponse429> Too many requests
     * @throws FetchError<500, types.SendMessageStoryResponse500> Internal Error
     */
    SDK.prototype.sendMessageStory = function (body) {
        return this.core.fetch('/messages/story', 'post', body);
    };
    /**
     * The method responsible for sending audio to your status. Remember that statuses
     * disappear after 24 hours. The requirements for [sending all media types are
     * identical](https://support.whapi.cloud/help-desk/sending/send-video-audio-image-document)
     *
     * @summary 🎵️ Send story audio message
     * @throws FetchError<400, types.SendMessageStoryAudioResponse400> Wrong request parameters
     * @throws FetchError<401, types.SendMessageStoryAudioResponse401> Need channel authorization for posting stories
     * @throws FetchError<402, types.SendMessageStoryAudioResponse402> Trial version limit exceeded
     * @throws FetchError<403, types.SendMessageStoryAudioResponse403> It is forbidden to send to this group/recipient
     * @throws FetchError<404, types.SendMessageStoryAudioResponse404> Media with specified id not found
     * @throws FetchError<413, types.SendMessageStoryAudioResponse413> Request media too large
     * @throws FetchError<415, types.SendMessageStoryAudioResponse415> Unsupported media type
     * @throws FetchError<429, types.SendMessageStoryAudioResponse429> Too many requests
     * @throws FetchError<500, types.SendMessageStoryAudioResponse500> Internal Error
     */
    SDK.prototype.sendMessageStoryAudio = function (body) {
        return this.core.fetch('/messages/story/audio', 'post', body);
    };
    /**
     * The method responsible for sending images or video to your status. Remember that
     * statuses disappear after 24 hours. The requirements for [sending all media types are
     * identical](https://support.whapi.cloud/help-desk/sending/send-video-audio-image-document)
     *
     * @summary 🖼 Send story media message
     * @throws FetchError<400, types.SendMessageStoryMediaResponse400> Wrong request parameters
     * @throws FetchError<401, types.SendMessageStoryMediaResponse401> Need channel authorization for posting stories
     * @throws FetchError<402, types.SendMessageStoryMediaResponse402> Trial version limit exceeded
     * @throws FetchError<403, types.SendMessageStoryMediaResponse403> It is forbidden to send to this group/recipient
     * @throws FetchError<404, types.SendMessageStoryMediaResponse404> Media with specified id not found
     * @throws FetchError<413, types.SendMessageStoryMediaResponse413> Request media too large
     * @throws FetchError<415, types.SendMessageStoryMediaResponse415> Unsupported media type
     * @throws FetchError<429, types.SendMessageStoryMediaResponse429> Too many requests
     * @throws FetchError<500, types.SendMessageStoryMediaResponse500> Internal Error
     */
    SDK.prototype.sendMessageStoryMedia = function (body) {
        return this.core.fetch('/messages/story/media', 'post', body);
    };
    /**
     * The method responsible for sending texts to your status. Remember that statuses
     * disappear after 24 hours.
     *
     * @summary 💬 Send story text message
     * @throws FetchError<400, types.SendMessageStoryTextResponse400> Wrong request parameters
     * @throws FetchError<401, types.SendMessageStoryTextResponse401> Need channel authorization for posting stories
     * @throws FetchError<402, types.SendMessageStoryTextResponse402> Trial version limit exceeded
     * @throws FetchError<403, types.SendMessageStoryTextResponse403> It is forbidden to send to this group/recipient
     * @throws FetchError<404, types.SendMessageStoryTextResponse404> Media with specified id not found
     * @throws FetchError<413, types.SendMessageStoryTextResponse413> Request media too large
     * @throws FetchError<415, types.SendMessageStoryTextResponse415> Unsupported media type
     * @throws FetchError<429, types.SendMessageStoryTextResponse429> Too many requests
     * @throws FetchError<500, types.SendMessageStoryTextResponse500> Internal Error
     */
    SDK.prototype.sendMessageStoryText = function (body) {
        return this.core.fetch('/messages/story/text', 'post', body);
    };
    /**
     * Additional endpoint for easy send media-file as message.
     * Use request body as file and inpath parameters for send parameters.
     * Media message can be one of the following types:
     * - 📷 image
     * - 🎥 video
     * - 🎬 gif
     * - 🎵 audio
     * - 🎤 voice
     * - 📄 document
     * - 🎭 sticker
     *
     *
     * @summary 📎 Send media message
     * @throws FetchError<400, types.SendMediaMessageResponse400> Wrong request parameters
     * @throws FetchError<401, types.SendMediaMessageResponse401> Need channel authorization for send message
     * @throws FetchError<402, types.SendMediaMessageResponse402> Trial version limit exceeded
     * @throws FetchError<404, types.SendMediaMessageResponse404> Media with specified id not found
     * @throws FetchError<413, types.SendMediaMessageResponse413> Request media too large
     * @throws FetchError<415, types.SendMediaMessageResponse415> Unsupported media type
     * @throws FetchError<429, types.SendMediaMessageResponse429> Too many requests
     * @throws FetchError<500, types.SendMediaMessageResponse500> Internal Error
     */
    SDK.prototype.sendMediaMessage = function (body, metadata) {
        return this.core.fetch('/messages/media/{MediaMessageType}', 'post', body, metadata);
    };
    /**
     * The method returns a message from any chat by message id.
     *
     * @summary Get message
     * @throws FetchError<400, types.GetMessageResponse400> Wrong request parameters
     * @throws FetchError<404, types.GetMessageResponse404> Specified message not found
     * @throws FetchError<500, types.GetMessageResponse500> Internal Error
     */
    SDK.prototype.getMessage = function (metadata) {
        return this.core.fetch('/messages/{MessageID}', 'get', metadata);
    };
    /**
     * Simple and straightforward, in this method, you can forward messages through the API by
     * providing the messageId of the message you want to forward and the phone number of the
     * chat where this messageId is located.
     *
     * @summary ↪ Forward message
     * @throws FetchError<400, types.ForwardMessageResponse400> Wrong request parameters
     * @throws FetchError<401, types.ForwardMessageResponse401> Need channel authorization for forward message
     * @throws FetchError<402, types.ForwardMessageResponse402> Trial version limit exceeded
     * @throws FetchError<404, types.ForwardMessageResponse404> Specified message not found
     * @throws FetchError<429, types.ForwardMessageResponse429> Too many requests
     * @throws FetchError<500, types.ForwardMessageResponse500> Internal Error
     */
    SDK.prototype.forwardMessage = function (body, metadata) {
        return this.core.fetch('/messages/{MessageID}', 'post', body, metadata);
    };
    /**
     * ✔✔ Mark message as read
     *
     * @throws FetchError<400, types.MarkMessageAsReadResponse400> Wrong request parameters
     * @throws FetchError<401, types.MarkMessageAsReadResponse401> Need channel authorization for mark as read message
     * @throws FetchError<404, types.MarkMessageAsReadResponse404> Specified message not found
     * @throws FetchError<500, types.MarkMessageAsReadResponse500> Internal Error
     */
    SDK.prototype.markMessageAsRead = function (metadata) {
        return this.core.fetch('/messages/{MessageID}', 'put', metadata);
    };
    /**
     * Method used to delete a text sent in a chat. You will be able to delete a message that
     * you sent as well as a message that was sent by a contact. To use this resource you will
     * only need the messageId of the message that you want to delete.
     *
     * @summary ❌ Delete message
     * @throws FetchError<400, types.DeleteMessageResponse400> Wrong request parameters
     * @throws FetchError<401, types.DeleteMessageResponse401> Need channel authorization for delete message
     * @throws FetchError<404, types.DeleteMessageResponse404> Specified message not found
     * @throws FetchError<500, types.DeleteMessageResponse500> Internal Error
     */
    SDK.prototype.deleteMessage = function (metadata) {
        return this.core.fetch('/messages/{MessageID}', 'delete', metadata);
    };
    /**
     * In this method you will be able to react to messages that were sent or recieved by you.
     * You will need to specify the ID of the message you will respond to, as well as [the
     * emoji](https://support.whapi.cloud/help-desk/sending/send-emoji)
     *
     * @summary 😍 React to message
     * @throws FetchError<400, types.ReactToMessageResponse400> Wrong request parameters
     * @throws FetchError<401, types.ReactToMessageResponse401> Need channel authorization for react to message
     * @throws FetchError<402, types.ReactToMessageResponse402> Trial version limit exceeded
     * @throws FetchError<404, types.ReactToMessageResponse404> Specified message not found
     * @throws FetchError<500, types.ReactToMessageResponse500> Internal Error
     */
    SDK.prototype.reactToMessage = function (body, metadata) {
        return this.core.fetch('/messages/{MessageID}/reaction', 'put', body, metadata);
    };
    /**
     * ⭐ Star message
     *
     * @throws FetchError<400, types.StarMessageResponse400> Wrong request parameters
     * @throws FetchError<401, types.StarMessageResponse401> Need channel authorization for star message
     * @throws FetchError<404, types.StarMessageResponse404> Specified message not found
     * @throws FetchError<500, types.StarMessageResponse500> Internal Error
     */
    SDK.prototype.starMessage = function (body, metadata) {
        return this.core.fetch('/messages/{MessageID}/star', 'put', body, metadata);
    };
    /**
     * This method is responsible for returning all of your chats. If you need to get a profile
     * pic of your contacts or chats, [refer to these
     * instructions](https://support.whapi.cloud/help-desk/receiving/http-api/get-a-profile-picture-of-a-chat-or-user).
     *
     * @summary Get chats
     * @throws FetchError<400, types.GetChatsResponse400> Wrong request parameters
     * @throws FetchError<500, types.GetChatsResponse500> Internal Error
     */
    SDK.prototype.getChats = function (metadata) {
        return this.core.fetch('/chats', 'get', metadata);
    };
    /**
     * This method is responsible for returning the metadata of a chat. Read more about [Chat
     * ID](https://support.whapi.cloud/help-desk/faq/chat-id.-what-is-it-and-how-to-get-it)
     *
     * @summary Get chat
     * @throws FetchError<400, types.GetChatResponse400> Wrong request parameters
     * @throws FetchError<404, types.GetChatResponse404> Specified chat not found
     * @throws FetchError<500, types.GetChatResponse500> Internal Error
     */
    SDK.prototype.getChat = function (metadata) {
        return this.core.fetch('/chats/{ChatID}', 'get', metadata);
    };
    /**
     * This method is responsible for deleting chats
     *
     * @summary ❌ Delete chat
     * @throws FetchError<400, types.DeleteChatResponse400> Wrong request parameters
     * @throws FetchError<401, types.DeleteChatResponse401> Need channel authorization for delete chat
     * @throws FetchError<404, types.DeleteChatResponse404> Specified chat not found
     * @throws FetchError<500, types.DeleteChatResponse500> Internal Error
     */
    SDK.prototype.deleteChat = function (metadata) {
        return this.core.fetch('/chats/{ChatID}', 'delete', metadata);
    };
    SDK.prototype.archiveChat = function (body, metadata) {
        return this.core.fetch('/chats/{ChatID}', 'post', body, metadata);
    };
    SDK.prototype.patchChat = function (body, metadata) {
        return this.core.fetch('/chats/{ChatID}', 'patch', body, metadata);
    };
    /**
     * This method is responsible for returning all of your Whatsapp contacts
     *
     * @summary Get contacts
     * @throws FetchError<400, types.GetContactsResponse400> Wrong request parameters
     * @throws FetchError<404, types.GetContactsResponse404> Specified contact not found
     * @throws FetchError<500, types.GetContactsResponse500> Internal Error
     */
    SDK.prototype.getContacts = function (metadata) {
        return this.core.fetch('/contacts', 'get', metadata);
    };
    /**
     * This method returns whether or not the number has Whatsapp. Batch check provisioning is
     * supported, and there is no batch check limit. However, an atypical mass check can draw
     * attention to your number, so we advise [balancing the check between
     * channels](https://support.whapi.cloud/help-desk/faq/checking-if-the-number-has-whatsapp)
     *
     * @summary Check phones
     * @throws FetchError<400, types.CheckPhonesResponse400> Wrong request parameters
     * @throws FetchError<401, types.CheckPhonesResponse401> Need channel authorization for check phones
     * @throws FetchError<402, types.CheckPhonesResponse402> Trial version limit exceeded
     * @throws FetchError<429, types.CheckPhonesResponse429> Too many requests
     * @throws FetchError<500, types.CheckPhonesResponse500> Internal Error
     */
    SDK.prototype.checkPhones = function (body) {
        return this.core.fetch('/contacts', 'post', body);
    };
    /**
     * This method is responsible for returning all of you contact’s metadata
     *
     * @summary Get contact
     * @throws FetchError<400, types.GetContactResponse400> Wrong request parameters
     * @throws FetchError<404, types.GetContactResponse404> Specified contact not found
     * @throws FetchError<500, types.GetContactResponse500> Internal Error
     */
    SDK.prototype.getContact = function (metadata) {
        return this.core.fetch('/contacts/{ContactID}', 'get', metadata);
    };
    /**
     * Send contact
     *
     * @throws FetchError<400, types.SendContactResponse400> Wrong request parameters
     * @throws FetchError<401, types.SendContactResponse401> Need channel authorization for add contact
     * @throws FetchError<404, types.SendContactResponse404> Specified contact not found
     * @throws FetchError<429, types.SendContactResponse429> Too many requests
     * @throws FetchError<500, types.SendContactResponse500> Internal Error
     */
    SDK.prototype.sendContact = function (body, metadata) {
        return this.core.fetch('/contacts/{ContactID}', 'post', body, metadata);
    };
    /**
     * The method individually checks for a number in WhatsApp without additional information
     *
     * @summary Check exist
     * @throws FetchError<400, types.CheckExistResponse400> Wrong request parameters
     * @throws FetchError<402, types.CheckExistResponse402> Trial version limit exceeded
     * @throws FetchError<404, types.CheckExistResponse404> Specified contact not registered
     * @throws FetchError<500, types.CheckExistResponse500> Internal Error
     */
    SDK.prototype.checkExist = function (metadata) {
        return this.core.fetch('/contacts/{ContactID}', 'head', metadata);
    };
    /**
     * This method allows you to get profile information (description, profile image) by phone
     * number, even if it is not in your contact list
     *
     * @summary Get profile
     * @throws FetchError<400, types.GetContactProfileResponse400> Wrong request parameters
     * @throws FetchError<401, types.GetContactProfileResponse401> Need channel authorization for getting user info
     * @throws FetchError<402, types.GetContactProfileResponse402> Trial version limit exceeded
     * @throws FetchError<404, types.GetContactProfileResponse404> Specified user not found
     * @throws FetchError<500, types.GetContactProfileResponse500> Internal Error
     */
    SDK.prototype.getContactProfile = function (metadata) {
        return this.core.fetch('/contacts/{ContactID}/profile', 'get', metadata);
    };
    /**
     * Send online or offline presence
     *
     * @throws FetchError<400, types.SendMePresenceResponse400> Wrong request parameters
     * @throws FetchError<401, types.SendMePresenceResponse401> Need channel authorization to send online or offline presence
     * @throws FetchError<404, types.SendMePresenceResponse404> Specified contact not found
     * @throws FetchError<500, types.SendMePresenceResponse500> Internal Error
     */
    SDK.prototype.sendMePresence = function (body) {
        return this.core.fetch('/presences/me', 'put', body);
    };
    /**
     * Get presence
     *
     * @throws FetchError<400, types.GetPresenceResponse400> Wrong request parameters
     * @throws FetchError<401, types.GetPresenceResponse401> Need channel authorization to get presence
     * @throws FetchError<404, types.GetPresenceResponse404> Specified contact presence not subscribed
     * @throws FetchError<500, types.GetPresenceResponse500> Internal Error
     */
    SDK.prototype.getPresence = function (metadata) {
        return this.core.fetch('/presences/{EntryID}', 'get', metadata);
    };
    /**
     * Subscribe to presence
     *
     * @throws FetchError<400, types.SubscribePresenceResponse400> Wrong request parameters
     * @throws FetchError<401, types.SubscribePresenceResponse401> Need channel authorization to subscribe to presence
     * @throws FetchError<402, types.SubscribePresenceResponse402> Trial version limit exceeded
     * @throws FetchError<404, types.SubscribePresenceResponse404> Specified contact not found in whatsapp
     * @throws FetchError<409, types.SubscribePresenceResponse409> Specified contact presence already subscribed
     * @throws FetchError<500, types.SubscribePresenceResponse500> Internal Error
     */
    SDK.prototype.subscribePresence = function (metadata) {
        return this.core.fetch('/presences/{EntryID}', 'post', metadata);
    };
    /**
     * Send typing or recording presence
     *
     * @throws FetchError<400, types.SendPresenceResponse400> Wrong request parameters
     * @throws FetchError<401, types.SendPresenceResponse401> Need channel authorization to send typing or recording presence
     * @throws FetchError<404, types.SendPresenceResponse404> Specified contact not found
     * @throws FetchError<500, types.SendPresenceResponse500> Internal Error
     */
    SDK.prototype.sendPresence = function (body, metadata) {
        return this.core.fetch('/presences/{EntryID}', 'put', body, metadata);
    };
    /**
     * Get groups
     *
     * @throws FetchError<400, types.GetGroupsResponse400> Wrong request parameters
     * @throws FetchError<500, types.GetGroupsResponse500> Internal Error
     */
    SDK.prototype.getGroups = function (metadata) {
        return this.core.fetch('/groups', 'get', metadata);
    };
    /**
     * This method is responsible for creating a group with its respective participants. Just
     * like WhatsApp you will need to add at least one contact to be able to create a group.
     * Due to WhatsApp's anti-spam policy, some contacts are not automatically added to the
     * group. [Read more
     * here](https://support.whapi.cloud/help-desk/groups/add-new-member-to-group)
     *
     * @summary Create group
     * @throws FetchError<400, types.CreateGroupResponse400> Wrong request parameters
     * @throws FetchError<401, types.CreateGroupResponse401> Need channel authorization for add group
     * @throws FetchError<404, types.CreateGroupResponse404> Specified participant not found in contacts list
     * @throws FetchError<429, types.CreateGroupResponse429> Too many requests
     * @throws FetchError<500, types.CreateGroupResponse500> Internal Error
     */
    SDK.prototype.createGroup = function (body) {
        return this.core.fetch('/groups', 'post', body);
    };
    /**
     * Allows you to join a group by knowing its invitation code
     *
     * @summary Accept group invite
     * @throws FetchError<400, types.AcceptGroupInviteResponse400> Wrong request parameters
     * @throws FetchError<401, types.AcceptGroupInviteResponse401> Need channel authorization for accept invite link
     * @throws FetchError<404, types.AcceptGroupInviteResponse404> Wrong invite code
     * @throws FetchError<500, types.AcceptGroupInviteResponse500> Internal Error
     */
    SDK.prototype.acceptGroupInvite = function (body) {
        return this.core.fetch('/groups', 'put', body);
    };
    /**
     * This method returns the group metadata with all information about the group and its
     * participants
     *
     * @summary Get group
     * @throws FetchError<400, types.GetGroupResponse400> Wrong request parameters
     * @throws FetchError<404, types.GetGroupResponse404> Specified group not found
     * @throws FetchError<500, types.GetGroupResponse500> Internal Error
     */
    SDK.prototype.getGroup = function (metadata) {
        return this.core.fetch('/groups/{GroupID}', 'get', metadata);
    };
    /**
     * This method is responsible for changing the name and description of a group that already
     * exists
     *
     * @summary Update group info
     * @throws FetchError<400, types.UpdateGroupInfoResponse400> Wrong request parameters
     * @throws FetchError<401, types.UpdateGroupInfoResponse401> Need channel authorization for update group
     * @throws FetchError<403, types.UpdateGroupInfoResponse403> You do not have permissions for this action
     * @throws FetchError<404, types.UpdateGroupInfoResponse404> Specified group not found
     * @throws FetchError<500, types.UpdateGroupInfoResponse500> Internal Error
     */
    SDK.prototype.updateGroupInfo = function (body, metadata) {
        return this.core.fetch('/groups/{GroupID}', 'put', body, metadata);
    };
    /**
     * This method allows you to leave a group that you are a member of
     *
     * @summary Leave group
     * @throws FetchError<400, types.LeaveGroupResponse400> Wrong request parameters
     * @throws FetchError<401, types.LeaveGroupResponse401> Need channel authorization for leave group
     * @throws FetchError<404, types.LeaveGroupResponse404> Specified group not found
     * @throws FetchError<500, types.LeaveGroupResponse500> Internal Error
     */
    SDK.prototype.leaveGroup = function (metadata) {
        return this.core.fetch('/groups/{GroupID}', 'delete', metadata);
    };
    /**
     * This method is responsible for changing the privacy settings for group
     *
     * @summary Update group setting
     * @throws FetchError<400, types.UpdateGroupSettingResponse400> Wrong request parameters
     * @throws FetchError<401, types.UpdateGroupSettingResponse401> Need channel authorization for update group
     * @throws FetchError<403, types.UpdateGroupSettingResponse403> You do not have permissions for this action
     * @throws FetchError<404, types.UpdateGroupSettingResponse404> Specified group not found
     * @throws FetchError<500, types.UpdateGroupSettingResponse500> Internal Error
     */
    SDK.prototype.updateGroupSetting = function (body, metadata) {
        return this.core.fetch('/groups/{GroupID}', 'patch', body, metadata);
    };
    /**
     * This method retrieves the ID of the group invitation. [What it is and how to work with
     * it](https://support.whapi.cloud/help-desk/groups/add-new-member-to-group#sending-an-invitation-to-a-group)
     *
     * @summary Get group invite
     * @throws FetchError<400, types.GetGroupInviteResponse400> Wrong request parameters
     * @throws FetchError<401, types.GetGroupInviteResponse401> Need channel authorization for create invite link
     * @throws FetchError<403, types.GetGroupInviteResponse403> You do not have permissions for this action
     * @throws FetchError<404, types.GetGroupInviteResponse404> Specified group not found
     * @throws FetchError<500, types.GetGroupInviteResponse500> Internal Error
     */
    SDK.prototype.getGroupInvite = function (metadata) {
        return this.core.fetch('/groups/{GroupID}/invite', 'get', metadata);
    };
    /**
     * Revoke group invite
     *
     * @throws FetchError<400, types.RevokeGroupInviteResponse400> Wrong request parameters
     * @throws FetchError<401, types.RevokeGroupInviteResponse401> Need channel authorization for delete invite link
     * @throws FetchError<404, types.RevokeGroupInviteResponse404> Specified group not found
     * @throws FetchError<500, types.RevokeGroupInviteResponse500> Internal Error
     */
    SDK.prototype.revokeGroupInvite = function (metadata) {
        return this.core.fetch('/groups/{GroupID}/invite', 'delete', metadata);
    };
    /**
     * This method is responsible for adding new members to the group. Due to WhatsApp's
     * anti-spam policy, some contacts are not automatically added to the group. [Read more
     * here](https://support.whapi.cloud/help-desk/groups/add-new-member-to-group)
     *
     * @summary Add group participant
     * @throws FetchError<400, types.AddGroupParticipantResponse400> Wrong request parameters
     * @throws FetchError<401, types.AddGroupParticipantResponse401> Need channel authorization for add participant
     * @throws FetchError<403, types.AddGroupParticipantResponse403> You do not have permissions for this action
     * @throws FetchError<404, types.AddGroupParticipantResponse404> Specified group or participant not found
     * @throws FetchError<409, types.AddGroupParticipantResponse409> Specified participant already in group
     * @throws FetchError<500, types.AddGroupParticipantResponse500> Internal Error
     */
    SDK.prototype.addGroupParticipant = function (body, metadata) {
        return this.core.fetch('/groups/{GroupID}/participants', 'post', body, metadata);
    };
    /**
     * This method is responsible for removing members of the group
     *
     * @summary Remove group participant
     * @throws FetchError<400, types.RemoveGroupParticipantResponse400> Wrong request parameters
     * @throws FetchError<401, types.RemoveGroupParticipantResponse401> Need channel authorization for remove participant
     * @throws FetchError<403, types.RemoveGroupParticipantResponse403> You do not have permissions for this action
     * @throws FetchError<404, types.RemoveGroupParticipantResponse404> Specified group or participant not found
     * @throws FetchError<500, types.RemoveGroupParticipantResponse500> Internal Error
     */
    SDK.prototype.removeGroupParticipant = function (body, metadata) {
        return this.core.fetch('/groups/{GroupID}/participants', 'delete', body, metadata);
    };
    /**
     * This method returns the profile image of group
     *
     * @summary Get group icon
     * @throws FetchError<400, types.GetGroupIconResponse400> Wrong request parameters
     * @throws FetchError<401, types.GetGroupIconResponse401> Need channel authorization for get group icon
     * @throws FetchError<403, types.GetGroupIconResponse403> You do not have permissions for this action
     * @throws FetchError<404, types.GetGroupIconResponse404> Specified group not found
     * @throws FetchError<500, types.GetGroupIconResponse500> Internal Error
     */
    SDK.prototype.getGroupIcon = function (metadata) {
        return this.core.fetch('/groups/{GroupID}/icon', 'get', metadata);
    };
    /**
     * This method is reponsibible for changing a group image that already exists
     *
     * @summary Set group icon
     * @throws FetchError<400, types.SetGroupIconResponse400> Wrong request parameters
     * @throws FetchError<401, types.SetGroupIconResponse401> Need channel authorization for set group icon
     * @throws FetchError<403, types.SetGroupIconResponse403> You do not have permissions for this action
     * @throws FetchError<404, types.SetGroupIconResponse404> Specified group not found
     * @throws FetchError<500, types.SetGroupIconResponse500> Internal Error
     */
    SDK.prototype.setGroupIcon = function (body, metadata) {
        return this.core.fetch('/groups/{GroupID}/icon', 'put', body, metadata);
    };
    /**
     * Delete group icon
     *
     * @throws FetchError<400, types.DeleteGroupIconResponse400> Wrong request parameters
     * @throws FetchError<401, types.DeleteGroupIconResponse401> Need channel authorization for delete group icon
     * @throws FetchError<403, types.DeleteGroupIconResponse403> You do not have permissions for this action
     * @throws FetchError<404, types.DeleteGroupIconResponse404> Specified group not found
     * @throws FetchError<500, types.DeleteGroupIconResponse500> Internal Error
     */
    SDK.prototype.deleteGroupIcon = function (metadata) {
        return this.core.fetch('/groups/{GroupID}/icon', 'delete', metadata);
    };
    /**
     * This method is responsible for removing one or more admins from a group
     *
     * @summary Demote group admin
     * @throws FetchError<400, types.DemoteGroupAdminResponse400> Wrong request parameters
     * @throws FetchError<401, types.DemoteGroupAdminResponse401> Need channel authorization for demote group admin
     * @throws FetchError<403, types.DemoteGroupAdminResponse403> You do not have permissions for this action
     * @throws FetchError<404, types.DemoteGroupAdminResponse404> Specified group or participant not found
     * @throws FetchError<500, types.DemoteGroupAdminResponse500> Internal Error
     */
    SDK.prototype.demoteGroupAdmin = function (body, metadata) {
        return this.core.fetch('/groups/{GroupID}/admins', 'delete', body, metadata);
    };
    /**
     * This method is responsible for promoting group members to admins, you can promote one or
     * more members to admins
     *
     * @summary Promote to group admin
     * @throws FetchError<400, types.PromoteToGroupAdminResponse400> Wrong request parameters
     * @throws FetchError<401, types.PromoteToGroupAdminResponse401> Need channel authorization for promote group admin
     * @throws FetchError<403, types.PromoteToGroupAdminResponse403> You do not have permissions for this action
     * @throws FetchError<404, types.PromoteToGroupAdminResponse404> Specified group or participant not found
     * @throws FetchError<500, types.PromoteToGroupAdminResponse500> Internal Error
     */
    SDK.prototype.promoteToGroupAdmin = function (body, metadata) {
        return this.core.fetch('/groups/{GroupID}/admins', 'patch', body, metadata);
    };
    /**
     * Send group invite link
     *
     * @throws FetchError<400, types.SendGroupInviteResponse400> Wrong request parameters
     * @throws FetchError<401, types.SendGroupInviteResponse401> Need channel authorization for this action
     * @throws FetchError<402, types.SendGroupInviteResponse402> Trial version limit exceeded
     * @throws FetchError<404, types.SendGroupInviteResponse404> Specified group not found
     * @throws FetchError<429, types.SendGroupInviteResponse429> Too many requests
     * @throws FetchError<500, types.SendGroupInviteResponse500> Internal Error
     */
    SDK.prototype.sendGroupInvite = function (body, metadata) {
        return this.core.fetch('/groups/link/{InviteCode}', 'post', body, metadata);
    };
    /**
     * Get group info by invite code
     *
     * @throws FetchError<400, types.GetGroupMetadataByInviteCodeResponse400> Wrong request parameters
     * @throws FetchError<401, types.GetGroupMetadataByInviteCodeResponse401> Need channel authorization for this action
     * @throws FetchError<404, types.GetGroupMetadataByInviteCodeResponse404> Specified group not found
     * @throws FetchError<429, types.GetGroupMetadataByInviteCodeResponse429> Too many requests
     * @throws FetchError<500, types.GetGroupMetadataByInviteCodeResponse500> Internal Error
     */
    SDK.prototype.getGroupMetadataByInviteCode = function (metadata) {
        return this.core.fetch('/groups/link/{InviteCode}', 'get', metadata);
    };
    /**
     * This method returns the list of join requests to the group
     *
     * @summary Get list of join requests to the group
     * @throws FetchError<400, types.GetGroupApplicationsListResponse400> Wrong request parameters
     * @throws FetchError<404, types.GetGroupApplicationsListResponse404> Specified group not found
     * @throws FetchError<500, types.GetGroupApplicationsListResponse500> Internal Error
     */
    SDK.prototype.getGroupApplicationsList = function (metadata) {
        return this.core.fetch('/groups/{GroupID}/applications', 'get', metadata);
    };
    /**
     * This method returns the list with result of operation for each user
     *
     * @summary Accept group applications for listed users
     * @throws FetchError<400, types.ApproveGroupApplicationsListResponse400> Wrong request parameters
     * @throws FetchError<404, types.ApproveGroupApplicationsListResponse404> Specified group not found
     * @throws FetchError<500, types.ApproveGroupApplicationsListResponse500> Internal Error
     */
    SDK.prototype.approveGroupApplicationsList = function (body, metadata) {
        return this.core.fetch('/groups/{GroupID}/applications', 'post', body, metadata);
    };
    /**
     * This method returns the list with result of operation for each user
     *
     * @summary Reject group applications for listed users
     * @throws FetchError<400, types.RejectGroupApplicationsListResponse400> Wrong request parameters
     * @throws FetchError<404, types.RejectGroupApplicationsListResponse404> Specified group not found
     * @throws FetchError<500, types.RejectGroupApplicationsListResponse500> Internal Error
     */
    SDK.prototype.rejectGroupApplicationsList = function (body, metadata) {
        return this.core.fetch('/groups/{GroupID}/applications', 'delete', body, metadata);
    };
    /**
     * Get list of stories
     *
     * @throws FetchError<400, types.GetStoriesResponse400> Wrong request parameters
     * @throws FetchError<500, types.GetStoriesResponse500> Internal Error
     */
    SDK.prototype.getStories = function (metadata) {
        return this.core.fetch('/stories', 'get', metadata);
    };
    /**
     * The method responsible for sending images or texts to your status. Remember that
     * statuses disappear after 24 hours. The requirements for [sending all media types are
     * identical](https://support.whapi.cloud/help-desk/sending/send-video-audio-image-document)
     *
     * @summary Create & publish story
     * @throws FetchError<400, types.CreateStoryResponse400> Wrong request parameters
     * @throws FetchError<401, types.CreateStoryResponse401> Need channel authorization for posting stories
     * @throws FetchError<402, types.CreateStoryResponse402> Trial version limit exceeded
     * @throws FetchError<404, types.CreateStoryResponse404> Media with specified id not found
     * @throws FetchError<413, types.CreateStoryResponse413> Request media too large
     * @throws FetchError<415, types.CreateStoryResponse415> Unsupported media type
     * @throws FetchError<429, types.CreateStoryResponse429> Too many requests
     * @throws FetchError<500, types.CreateStoryResponse500> Internal Error
     */
    SDK.prototype.createStory = function (body) {
        return this.core.fetch('/stories', 'post', body);
    };
    /**
     * The method responsible for sending texts to your status. Remember that statuses
     * disappear after 24 hours.
     *
     * @summary 💬 Post text story
     * @throws FetchError<400, types.CreateStoryTextResponse400> Wrong request parameters
     * @throws FetchError<401, types.CreateStoryTextResponse401> Need channel authorization for posting stories
     * @throws FetchError<402, types.CreateStoryTextResponse402> Trial version limit exceeded
     * @throws FetchError<403, types.CreateStoryTextResponse403> It is forbidden to send to this group/recipient
     * @throws FetchError<404, types.CreateStoryTextResponse404> Media with specified id not found
     * @throws FetchError<413, types.CreateStoryTextResponse413> Request media too large
     * @throws FetchError<415, types.CreateStoryTextResponse415> Unsupported media type
     * @throws FetchError<429, types.CreateStoryTextResponse429> Too many requests
     * @throws FetchError<500, types.CreateStoryTextResponse500> Internal Error
     */
    SDK.prototype.createStoryText = function (body) {
        return this.core.fetch('/stories/send/text', 'post', body);
    };
    /**
     * The method responsible for sending images or video to your status. Remember that
     * statuses disappear after 24 hours. The requirements for [sending all media types are
     * identical](https://support.whapi.cloud/help-desk/sending/send-video-audio-image-document)
     *
     * @summary 🖼 Post media story
     * @throws FetchError<400, types.CreateStoryMediaResponse400> Wrong request parameters
     * @throws FetchError<401, types.CreateStoryMediaResponse401> Need channel authorization for posting stories
     * @throws FetchError<402, types.CreateStoryMediaResponse402> Trial version limit exceeded
     * @throws FetchError<403, types.CreateStoryMediaResponse403> It is forbidden to send to this group/recipient
     * @throws FetchError<404, types.CreateStoryMediaResponse404> Media with specified id not found
     * @throws FetchError<413, types.CreateStoryMediaResponse413> Request media too large
     * @throws FetchError<415, types.CreateStoryMediaResponse415> Unsupported media type
     * @throws FetchError<429, types.CreateStoryMediaResponse429> Too many requests
     * @throws FetchError<500, types.CreateStoryMediaResponse500> Internal Error
     */
    SDK.prototype.createStoryMedia = function (body) {
        return this.core.fetch('/stories/send/media', 'post', body);
    };
    /**
     * The method responsible for sending audio to your status. Remember that statuses
     * disappear after 24 hours. The requirements for [sending all media types are
     * identical](https://support.whapi.cloud/help-desk/sending/send-video-audio-image-document)
     *
     * @summary 🎵️ Post audio story
     * @throws FetchError<400, types.CreateStoryAudioResponse400> Wrong request parameters
     * @throws FetchError<401, types.CreateStoryAudioResponse401> Need channel authorization for posting stories
     * @throws FetchError<402, types.CreateStoryAudioResponse402> Trial version limit exceeded
     * @throws FetchError<403, types.CreateStoryAudioResponse403> It is forbidden to send to this group/recipient
     * @throws FetchError<404, types.CreateStoryAudioResponse404> Media with specified id not found
     * @throws FetchError<413, types.CreateStoryAudioResponse413> Request media too large
     * @throws FetchError<415, types.CreateStoryAudioResponse415> Unsupported media type
     * @throws FetchError<429, types.CreateStoryAudioResponse429> Too many requests
     * @throws FetchError<500, types.CreateStoryAudioResponse500> Internal Error
     */
    SDK.prototype.createStoryAudio = function (body) {
        return this.core.fetch('/stories/send/audio', 'post', body);
    };
    /**
     * Get message or story view statuses
     *
     * @throws FetchError<400, types.GetMessageViewStatusesResponse400> Wrong request parameters
     * @throws FetchError<403, types.GetMessageViewStatusesResponse403> View statuses available only for outgoing messages
     * @throws FetchError<404, types.GetMessageViewStatusesResponse404> Specified message not found
     * @throws FetchError<500, types.GetMessageViewStatusesResponse500> Internal Error
     */
    SDK.prototype.getMessageViewStatuses = function (metadata) {
        return this.core.fetch('/statuses/{MessageID}', 'get', metadata);
    };
    /**
     * This method returns a list with metadata of your own WhatsApp Channel and followed
     * Channels, including all Channel information and their views.
     *
     * @summary Get newsletters
     * @throws FetchError<400, types.GetNewslettersResponse400> Wrong request parameters
     * @throws FetchError<500, types.GetNewslettersResponse500> Internal Error
     */
    SDK.prototype.getNewsletters = function (metadata) {
        return this.core.fetch('/newsletters', 'get', metadata);
    };
    /**
     * This method is responsible for creating a WhatsApp Channel. [How to send a post to
     * WhatsApp
     * Channel](https://support.whapi.cloud/help-desk/channels/send-post-to-whatsapp-channel)
     *
     * @summary Create newsletter
     * @throws FetchError<400, types.CreateNewsletterResponse400> Wrong request parameters
     * @throws FetchError<401, types.CreateNewsletterResponse401> Need channel authorization for add group
     * @throws FetchError<404, types.CreateNewsletterResponse404> Specified participant not found in contacts list
     * @throws FetchError<429, types.CreateNewsletterResponse429> Too many requests
     * @throws FetchError<500, types.CreateNewsletterResponse500> Internal Error
     */
    SDK.prototype.createNewsletter = function (body) {
        return this.core.fetch('/newsletters', 'post', body);
    };
    /**
     * This method returns a list of WhatsApp Channels data based on the search performed using
     * filters provided in the request body
     *
     * @summary Find newsletters by filters
     * @throws FetchError<400, types.FindNewsletterResponse400> Wrong request parameters
     * @throws FetchError<404, types.FindNewsletterResponse404> Specified newsletter not found
     * @throws FetchError<500, types.FindNewsletterResponse500> Internal Error
     */
    SDK.prototype.findNewsletter = function (metadata) {
        return this.core.fetch('/newsletters/find', 'get', metadata);
    };
    /**
     * This method returns a list of WhatsApp Channels data based on the search performed using
     * filters provided in the request body
     *
     * @summary Get recommended newsletters by country
     * @throws FetchError<400, types.RecommendedNewsletterResponse400> Wrong request parameters
     * @throws FetchError<404, types.RecommendedNewsletterResponse404> Specified newsletter not found
     * @throws FetchError<500, types.RecommendedNewsletterResponse500> Internal Error
     */
    SDK.prototype.recommendedNewsletter = function (metadata) {
        return this.core.fetch('/newsletters/recommended', 'get', metadata);
    };
    /**
     * This method returns the metadata of a WhatsApp Channel, including all newsletter
     * information and its views
     *
     * @summary Get newsletter information
     * @throws FetchError<400, types.GetNewsletterResponse400> Wrong request parameters
     * @throws FetchError<404, types.GetNewsletterResponse404> Specified newsletter not found
     * @throws FetchError<500, types.GetNewsletterResponse500> Internal Error
     */
    SDK.prototype.getNewsletter = function (metadata) {
        return this.core.fetch('/newsletters/{NewsletterID}', 'get', metadata);
    };
    /**
     * This method is responsible for deleting a WhatsApp Channel
     *
     * @summary Delete newsletter
     * @throws FetchError<400, types.DeleteNewsletterResponse400> Wrong request parameters
     * @throws FetchError<401, types.DeleteNewsletterResponse401> Need to be owner of newsletter
     * @throws FetchError<404, types.DeleteNewsletterResponse404> Specified newsletter not found
     * @throws FetchError<500, types.DeleteNewsletterResponse500> Internal Error
     */
    SDK.prototype.deleteNewsletter = function (metadata) {
        return this.core.fetch('/newsletters/{NewsletterID}', 'delete', metadata);
    };
    /**
     * This method is responsible for editing a WhatsApp Newsletter Channel
     *
     * @summary Edit newsletter
     * @throws FetchError<400, types.EditNewsletterResponse400> Wrong request parameters
     * @throws FetchError<401, types.EditNewsletterResponse401> Need admin permissions for edit newsletter
     * @throws FetchError<404, types.EditNewsletterResponse404> Specified newsletter not found
     * @throws FetchError<429, types.EditNewsletterResponse429> Too many requests
     * @throws FetchError<500, types.EditNewsletterResponse500> Internal Error
     */
    SDK.prototype.editNewsletter = function (body, metadata) {
        return this.core.fetch('/newsletters/{NewsletterID}', 'patch', body, metadata);
    };
    /**
     * This method is responsible for following a WhatsApp Channel
     *
     * @summary Subscribe to newsletter
     * @throws FetchError<400, types.SubscribeNewsletterResponse400> Wrong request parameters
     * @throws FetchError<404, types.SubscribeNewsletterResponse404> Specified newsletter not found
     * @throws FetchError<500, types.SubscribeNewsletterResponse500> Internal Error
     */
    SDK.prototype.subscribeNewsletter = function (metadata) {
        return this.core.fetch('/newsletters/{NewsletterID}/subscription', 'post', metadata);
    };
    /**
     * This method is responsible for unfollowing a WhatsApp Channel
     *
     * @summary Unsubscribe from newsletter
     * @throws FetchError<400, types.UnsubscribeNewsletterResponse400> Wrong request parameters
     * @throws FetchError<404, types.UnsubscribeNewsletterResponse404> Specified newsletter not found
     * @throws FetchError<500, types.UnsubscribeNewsletterResponse500> Internal Error
     */
    SDK.prototype.unsubscribeNewsletter = function (metadata) {
        return this.core.fetch('/newsletters/{NewsletterID}/subscription', 'delete', metadata);
    };
    /**
     * This method is responsible for following a WhatsApp Channel
     *
     * @summary Subscribe to newsletter by invite code
     * @throws FetchError<400, types.SubscribeNewsletterInviteResponse400> Wrong request parameters
     * @throws FetchError<404, types.SubscribeNewsletterInviteResponse404> Specified newsletter not found
     * @throws FetchError<500, types.SubscribeNewsletterInviteResponse500> Internal Error
     */
    SDK.prototype.subscribeNewsletterInvite = function (metadata) {
        return this.core.fetch('/newsletters/invite/{NewsletterInviteCode}/subscription', 'post', metadata);
    };
    /**
     * This method is responsible for unfollowing a WhatsApp Channel
     *
     * @summary Unsubscribe from newsletter by invite code
     * @throws FetchError<400, types.UnsubscribeNewsletterInviteResponse400> Wrong request parameters
     * @throws FetchError<404, types.UnsubscribeNewsletterInviteResponse404> Specified newsletter not found
     * @throws FetchError<500, types.UnsubscribeNewsletterInviteResponse500> Internal Error
     */
    SDK.prototype.unsubscribeNewsletterInvite = function (metadata) {
        return this.core.fetch('/newsletters/invite/{NewsletterInviteCode}/subscription', 'delete', metadata);
    };
    /**
     * It is necessary to receive notifications about new votes in the polls
     *
     * @summary Subscribe to newsletter updates
     * @throws FetchError<400, types.TrackingNewsletterResponse400> Wrong request parameters
     * @throws FetchError<404, types.TrackingNewsletterResponse404> Specified newsletter not found
     * @throws FetchError<500, types.TrackingNewsletterResponse500> Internal Error
     */
    SDK.prototype.trackingNewsletter = function (metadata) {
        return this.core.fetch('/newsletters/{NewsletterID}/tracking', 'post', metadata);
    };
    /**
     * The method returns the history of WhatsApp Channel messages
     *
     * @summary Get newsletter messages
     * @throws FetchError<400, types.GetMessagesNewsletterResponse400> Wrong request parameters
     * @throws FetchError<404, types.GetMessagesNewsletterResponse404> Specified newsletter not found
     * @throws FetchError<500, types.GetMessagesNewsletterResponse500> Internal Error
     */
    SDK.prototype.getMessagesNewsletter = function (metadata) {
        return this.core.fetch('/newsletters/{NewsletterID}/messages', 'get', metadata);
    };
    SDK.prototype.createNewsletterAdminInvite = function (body, metadata) {
        return this.core.fetch('/newsletters/{NewsletterID}/invite/{ContactID}', 'post', body, metadata);
    };
    /**
     * This method is responsible for revoking an invitation for WhatsApp Channel
     * administrator.
     *
     * @summary Revoke Newsletter admin-invite
     * @throws FetchError<400, types.RevokeNewsletterAdminInviteResponse400> Wrong request parameters
     * @throws FetchError<401, types.RevokeNewsletterAdminInviteResponse401> Need channel authorization for this action
     * @throws FetchError<404, types.RevokeNewsletterAdminInviteResponse404> Specified newsletter not found
     * @throws FetchError<500, types.RevokeNewsletterAdminInviteResponse500> Internal Error
     */
    SDK.prototype.revokeNewsletterAdminInvite = function (metadata) {
        return this.core.fetch('/newsletters/{NewsletterID}/invite/{ContactID}', 'delete', metadata);
    };
    /**
     * This method is responsible for accepting an request to become an administrator of a
     * WhatsApp Channel. This request is a message that you can both send like invitation and
     * receive through the received message webhook
     *
     * @summary Accept Newsletter admin-request
     * @throws FetchError<400, types.AcceptNewsletterAdminRequestResponse400> Wrong request parameters
     * @throws FetchError<401, types.AcceptNewsletterAdminRequestResponse401> Need channel authorization for this action
     * @throws FetchError<404, types.AcceptNewsletterAdminRequestResponse404> Specified newsletter not found
     * @throws FetchError<500, types.AcceptNewsletterAdminRequestResponse500> Internal Error
     */
    SDK.prototype.acceptNewsletterAdminRequest = function (metadata) {
        return this.core.fetch('/newsletters/{NewsletterID}/admins/{ContactID}', 'put', metadata);
    };
    /**
     * This method is responsible for removing a user from the administration of the WhatsApp
     * Channel
     *
     * @summary Demote Newsletter admin
     * @throws FetchError<400, types.DemoteNewsletterAdminResponse400> Wrong request parameters
     * @throws FetchError<401, types.DemoteNewsletterAdminResponse401> Need channel authorization for this action
     * @throws FetchError<404, types.DemoteNewsletterAdminResponse404> Specified newsletter not found
     * @throws FetchError<500, types.DemoteNewsletterAdminResponse500> Internal Error
     */
    SDK.prototype.demoteNewsletterAdmin = function (metadata) {
        return this.core.fetch('/newsletters/{NewsletterID}/admins/{ContactID}', 'delete', metadata);
    };
    /**
     * Send newsletter invite link
     *
     * @throws FetchError<400, types.SendNewsletterInviteResponse400> Wrong request parameters
     * @throws FetchError<401, types.SendNewsletterInviteResponse401> Need channel authorization for this action
     * @throws FetchError<404, types.SendNewsletterInviteResponse404> Specified newsletter not found
     * @throws FetchError<429, types.SendNewsletterInviteResponse429> Too many requests
     * @throws FetchError<500, types.SendNewsletterInviteResponse500> Internal Error
     */
    SDK.prototype.sendNewsletterInvite = function (body, metadata) {
        return this.core.fetch('/newsletters/link/{NewsletterInviteCode}', 'post', body, metadata);
    };
    /**
     * Get newsletter info by invite code
     *
     * @throws FetchError<400, types.GetNewsletterByInviteCodeResponse400> Wrong request parameters
     * @throws FetchError<401, types.GetNewsletterByInviteCodeResponse401> Need channel authorization for this action
     * @throws FetchError<404, types.GetNewsletterByInviteCodeResponse404> Specified newsletter not found
     * @throws FetchError<429, types.GetNewsletterByInviteCodeResponse429> Too many requests
     * @throws FetchError<500, types.GetNewsletterByInviteCodeResponse500> Internal Error
     */
    SDK.prototype.getNewsletterByInviteCode = function (metadata) {
        return this.core.fetch('/newsletters/link/{NewsletterInviteCode}', 'get', metadata);
    };
    /**
     * The method is designed to get mediaID for any type of file uploaded through a form
     * (form-data). In response, you will receive an identifier for the uploaded file, which
     * you can use in the future. The type of the file to be sent and the method of sending it
     * are determined by the file extension.
     *
     * @summary Upload media
     * @throws FetchError<400, types.UploadMediaResponse400> Wrong request parameters
     * @throws FetchError<401, types.UploadMediaResponse401> Need channel authorization for upload media
     * @throws FetchError<500, types.UploadMediaResponse500> Internal Error
     */
    SDK.prototype.uploadMedia = function (body) {
        return this.core.fetch('/media', 'post', body);
    };
    /**
     * This method is responsible for returning all of your media files
     *
     * @summary Get media files
     * @throws FetchError<400, types.GetMediaFilesResponse400> Wrong request parameters
     * @throws FetchError<500, types.GetMediaFilesResponse500> Internal Error
     */
    SDK.prototype.getMediaFiles = function (metadata) {
        return this.core.fetch('/media', 'get', metadata);
    };
    /**
     * Receive a file from the cloud by ID
     *
     * @summary Get media
     * @throws FetchError<400, types.GetMediaResponse400> Wrong request parameters
     * @throws FetchError<404, types.GetMediaResponse404> Specified media not found
     * @throws FetchError<500, types.GetMediaResponse500> Internal Error
     */
    SDK.prototype.getMedia = function (metadata) {
        return this.core.fetch('/media/{MediaID}', 'get', metadata);
    };
    /**
     * Delete a file from the cloud by ID
     *
     * @summary Delete media
     * @throws FetchError<400, types.DeleteMediaResponse400> Wrong request parameters
     * @throws FetchError<404, types.DeleteMediaResponse404> Specified media not found
     * @throws FetchError<500, types.DeleteMediaResponse500> Internal Error
     */
    SDK.prototype.deleteMedia = function (metadata) {
        return this.core.fetch('/media/{MediaID}', 'delete', metadata);
    };
    /**
     * Through this method, it is possible to add the contact on the disallowed list
     * (blacklist). This will restrict the specified numbers to certain interactions with your
     * account
     *
     * @summary Add contact to blacklist
     * @throws FetchError<400, types.BlacklistAddResponse400> Wrong request parameters
     * @throws FetchError<404, types.BlacklistAddResponse404> Specified contact not found
     * @throws FetchError<500, types.BlacklistAddResponse500> Internal Error
     */
    SDK.prototype.blacklistAdd = function (metadata) {
        return this.core.fetch('/blacklist/{ContactID}', 'put', metadata);
    };
    /**
     * Through this method, it is possible to remove the contact on the disallowed list
     * (blacklist)
     *
     * @summary Remove contact from blacklist
     * @throws FetchError<400, types.BlacklistRemoveResponse400> Wrong request parameters
     * @throws FetchError<404, types.BlacklistRemoveResponse404> Specified contact not found
     * @throws FetchError<500, types.BlacklistRemoveResponse500> Internal Error
     */
    SDK.prototype.blacklistRemove = function (metadata) {
        return this.core.fetch('/blacklist/{ContactID}', 'delete', metadata);
    };
    /**
     * With this method you will be able to get the products from a Whatsapp Business catalog
     *
     * @summary Get products
     * @throws FetchError<400, types.GetProductsResponse400> Wrong request parameters
     * @throws FetchError<401, types.GetProductsResponse401> Need channel authorization for getting products
     * @throws FetchError<500, types.GetProductsResponse500> Internal Error
     */
    SDK.prototype.getProducts = function (metadata) {
        return this.core.fetch('/business/products', 'get', metadata);
    };
    /**
     * In this method you will be able to register a product in your catalog
     *
     * @summary Create product
     * @throws FetchError<400, types.CreateProductResponse400> Wrong request parameters
     * @throws FetchError<401, types.CreateProductResponse401> Need channel authorization for getting products
     * @throws FetchError<429, types.CreateProductResponse429> Too many requests
     * @throws FetchError<500, types.CreateProductResponse500> Internal Error
     */
    SDK.prototype.createProduct = function (body) {
        return this.core.fetch('/business/products', 'post', body);
    };
    /**
     * This method allows you to get the catalog and products by [Chat
     * ID](https://support.whapi.cloud/help-desk/faq/chat-id.-what-is-it-and-how-to-get-it),
     * even if it is not in your contact list
     *
     * @summary Get products by Contact ID
     * @throws FetchError<400, types.GetContactProductsResponse400> Wrong request parameters
     * @throws FetchError<401, types.GetContactProductsResponse401> Need channel authorization for getting products
     * @throws FetchError<404, types.GetContactProductsResponse404> Specified user not found
     * @throws FetchError<500, types.GetContactProductsResponse500> Internal Error
     */
    SDK.prototype.getContactProducts = function (metadata) {
        return this.core.fetch('/business/{ContactID}/products', 'get', metadata);
    };
    /**
     * In this method you will be able to get your product by its ID
     *
     * @summary Get product
     * @throws FetchError<400, types.GetProductResponse400> Wrong request parameters
     * @throws FetchError<401, types.GetProductResponse401> Need channel authorization for getting products
     * @throws FetchError<404, types.GetProductResponse404> Specified product not found
     * @throws FetchError<500, types.GetProductResponse500> Internal Error
     */
    SDK.prototype.getProduct = function (metadata) {
        return this.core.fetch('/business/products/{ProductID}', 'get', metadata);
    };
    /**
     * The method is for sending an item from your catalog
     *
     * @summary Send product
     * @throws FetchError<400, types.SendProductResponse400> Wrong request parameters
     * @throws FetchError<401, types.SendProductResponse401> Need channel authorization for add contact
     * @throws FetchError<404, types.SendProductResponse404> Specified product not found
     * @throws FetchError<429, types.SendProductResponse429> Too many requests
     * @throws FetchError<500, types.SendProductResponse500> Internal Error
     */
    SDK.prototype.sendProduct = function (body, metadata) {
        return this.core.fetch('/business/products/{ProductID}', 'post', body, metadata);
    };
    /**
     * The *images* field is required and must contain all images
     *
     * @summary Update product
     * @throws FetchError<400, types.UpdateProductResponse400> Wrong request parameters
     * @throws FetchError<401, types.UpdateProductResponse401> Need channel authorization for update product
     * @throws FetchError<404, types.UpdateProductResponse404> Specified product not found
     * @throws FetchError<429, types.UpdateProductResponse429> Too many requests
     * @throws FetchError<500, types.UpdateProductResponse500> Internal Error
     */
    SDK.prototype.updateProduct = function (body, metadata) {
        return this.core.fetch('/business/products/{ProductID}', 'patch', body, metadata);
    };
    /**
     * In this method you will be able to delete a product by its ID
     *
     * @summary Delete product
     * @throws FetchError<400, types.DeleteProductResponse400> Wrong request parameters
     * @throws FetchError<401, types.DeleteProductResponse401> Need channel authorization for update product
     * @throws FetchError<404, types.DeleteProductResponse404> Specified product not found
     * @throws FetchError<429, types.DeleteProductResponse429> Too many requests
     * @throws FetchError<500, types.DeleteProductResponse500> Internal Error
     */
    SDK.prototype.deleteProduct = function (metadata) {
        return this.core.fetch('/business/products/{ProductID}', 'delete', metadata);
    };
    /**
     * The method allows you to get information about the items in the shopping cart sent to
     * you in messages. Note! Use the token as a Query (as in a get request). [More details in
     * the knowledge
     * base](https://support.whapi.cloud/help-desk/receiving/http-api/get-order-items)
     *
     * @summary Get order items
     * @throws FetchError<401, types.GetOrderItemsResponse401> Need channel authorization for getting products
     * @throws FetchError<403, types.GetOrderItemsResponse403> Need order token for getting products
     * @throws FetchError<404, types.GetOrderItemsResponse404> Specified order not found
     * @throws FetchError<500, types.GetOrderItemsResponse500> Internal Error
     */
    SDK.prototype.getOrderItems = function (metadata) {
        return this.core.fetch('/business/orders/{OrderID}', 'get', metadata);
    };
    /**
     * Send catalog by Contact ID (phone number)
     *
     * @throws FetchError<400, types.SendCatalogResponse400> Wrong request parameters
     * @throws FetchError<401, types.SendCatalogResponse401> Need channel authorization for send catalog
     * @throws FetchError<404, types.SendCatalogResponse404> Specified contact not found
     * @throws FetchError<429, types.SendCatalogResponse429> Too many requests
     * @throws FetchError<500, types.SendCatalogResponse500> Internal Error
     */
    SDK.prototype.sendCatalog = function (body, metadata) {
        return this.core.fetch('/business/catalogs/{ContactID}', 'post', body, metadata);
    };
    /**
     * In this method, you retrieve all your registered labels in your WhatsApp Business
     *
     * @summary Get labels
     * @throws FetchError<400, types.GetLabelsResponse400> Wrong request parameters
     * @throws FetchError<500, types.GetLabelsResponse500> Internal Error
     */
    SDK.prototype.getLabels = function () {
        return this.core.fetch('/labels', 'get');
    };
    /**
     * Get objects associated with label
     *
     * @throws FetchError<400, types.GetLabelAssociationsResponse400> Wrong request parameters
     * @throws FetchError<404, types.GetLabelAssociationsResponse404> Specified label not found
     * @throws FetchError<500, types.GetLabelAssociationsResponse500> Internal Error
     */
    SDK.prototype.getLabelAssociations = function (metadata) {
        return this.core.fetch('/labels/{LabelID}', 'get', metadata);
    };
    /**
     * Through this method, it is possible to assign a label to a chat in WhatsApp Business
     *
     * @summary Add label association
     * @throws FetchError<400, types.AddLabelAssociationResponse400> Wrong request parameters
     * @throws FetchError<401, types.AddLabelAssociationResponse401> Need channel authorization for add label association
     * @throws FetchError<404, types.AddLabelAssociationResponse404> Specified chat or message not found
     * @throws FetchError<409, types.AddLabelAssociationResponse409> Label association already exists
     * @throws FetchError<500, types.AddLabelAssociationResponse500> Internal Error
     */
    SDK.prototype.addLabelAssociation = function (metadata) {
        return this.core.fetch('/labels/{LabelID}/{AssociationID}', 'post', metadata);
    };
    /**
     * Through this method, it is possible to remove the labels from a chat in WhatsApp
     * Business
     *
     * @summary Delete label association
     * @throws FetchError<400, types.DeleteLabelAssociationResponse400> Wrong request parameters
     * @throws FetchError<401, types.DeleteLabelAssociationResponse401> Need channel authorization for delete label association
     * @throws FetchError<404, types.DeleteLabelAssociationResponse404> Specified association not found
     * @throws FetchError<500, types.DeleteLabelAssociationResponse500> Internal Error
     */
    SDK.prototype.deleteLabelAssociation = function (metadata) {
        return this.core.fetch('/labels/{LabelID}/{AssociationID}', 'delete', metadata);
    };
    /**
     * Sandbox as well as Trials have some limitations. This endpoint allows you to get
     * information about the remaining and used limits on your channel
     *
     * @summary Get limits
     * @throws FetchError<500, types.GetLimitsResponse500> Internal Error
     */
    SDK.prototype.getLimits = function () {
        return this.core.fetch('/limits', 'get');
    };
    /**
     * This method is responsible for get a communities. [Learn more about the nuances of
     * community:](https://support.whapi.cloud/help-desk/communities/introduction)
     *
     * @summary Get communities
     * @throws FetchError<400, types.GetCommunitiesResponse400> Wrong request parameters
     * @throws FetchError<401, types.GetCommunitiesResponse401> Need channel authorization to get info
     * @throws FetchError<500, types.GetCommunitiesResponse500> Internal Error
     */
    SDK.prototype.getCommunities = function (metadata) {
        return this.core.fetch('/communities', 'get', metadata);
    };
    /**
     * This method is responsible for creating a community. [Learn more about the nuances of
     * community:](https://support.whapi.cloud/help-desk/communities/introduction)
     *
     * @summary Create community
     * @throws FetchError<400, types.CreateCommunityResponse400> Wrong request parameters
     * @throws FetchError<401, types.CreateCommunityResponse401> Need channel authorization for add community
     * @throws FetchError<500, types.CreateCommunityResponse500> Internal Error
     */
    SDK.prototype.createCommunity = function (body) {
        return this.core.fetch('/communities', 'post', body);
    };
    /**
     * This method is responsible for get a community. [Learn more about the nuances of
     * community:](https://support.whapi.cloud/help-desk/communities/introduction)
     *
     * @summary Get community
     * @throws FetchError<400, types.GetCommunityResponse400> Wrong request parameters
     * @throws FetchError<401, types.GetCommunityResponse401> Need channel authorization to get info
     * @throws FetchError<404, types.GetCommunityResponse404> Community not found
     * @throws FetchError<500, types.GetCommunityResponse500> Internal Error
     */
    SDK.prototype.getCommunity = function (metadata) {
        return this.core.fetch('/communities/{CommunityID}', 'get', metadata);
    };
    /**
     * This method is responsible for deactivate community.
     *
     * @summary Deactivate community
     * @throws FetchError<400, types.DeactivateCommunityResponse400> Wrong request parameters
     * @throws FetchError<401, types.DeactivateCommunityResponse401> Need channel authorization
     * @throws FetchError<403, types.DeactivateCommunityResponse403> Not permission
     * @throws FetchError<404, types.DeactivateCommunityResponse404> Community not found
     * @throws FetchError<500, types.DeactivateCommunityResponse500> Internal Error
     */
    SDK.prototype.deactivateCommunity = function (metadata) {
        return this.core.fetch('/communities/{CommunityID}', 'delete', metadata);
    };
    /**
     * Revoke community invite
     *
     * @throws FetchError<400, types.RevokeCommunityInviteResponse400> Wrong request parameters
     * @throws FetchError<401, types.RevokeCommunityInviteResponse401> Need channel authorization for delete invite link
     * @throws FetchError<404, types.RevokeCommunityInviteResponse404> Specified community not found
     * @throws FetchError<500, types.RevokeCommunityInviteResponse500> Internal Error
     */
    SDK.prototype.revokeCommunityInvite = function (metadata) {
        return this.core.fetch('/communities/{CommunityID}/revokeInviteUrl', 'delete', metadata);
    };
    /**
     * This method is responsible for unlink group from community.
     *
     * @summary Unlink group from community
     * @throws FetchError<400, types.UnlinkGroupFromCommunityResponse400> Wrong request parameters
     * @throws FetchError<401, types.UnlinkGroupFromCommunityResponse401> Need channel authorization
     * @throws FetchError<403, types.UnlinkGroupFromCommunityResponse403> Not permission
     * @throws FetchError<404, types.UnlinkGroupFromCommunityResponse404> Community not found
     * @throws FetchError<500, types.UnlinkGroupFromCommunityResponse500> Internal Error
     */
    SDK.prototype.unlinkGroupFromCommunity = function (metadata) {
        return this.core.fetch('/communities/{CommunityID}/{GroupID}', 'delete', metadata);
    };
    /**
     * This method is responsible for link group to community.
     *
     * @summary Link group to community
     * @throws FetchError<400, types.LinkGroupToCommunityResponse400> Wrong request parameters
     * @throws FetchError<401, types.LinkGroupToCommunityResponse401> Need channel authorization
     * @throws FetchError<403, types.LinkGroupToCommunityResponse403> Not permission
     * @throws FetchError<404, types.LinkGroupToCommunityResponse404> Community not found
     * @throws FetchError<500, types.LinkGroupToCommunityResponse500> Internal Error
     */
    SDK.prototype.linkGroupToCommunity = function (metadata) {
        return this.core.fetch('/communities/{CommunityID}/{GroupID}', 'put', metadata);
    };
    /**
     * This method is responsible for change a community settings.
     *
     * @summary Change community settings
     * @throws FetchError<400, types.ChangeCommunitySettingsResponse400> Wrong request parameters
     * @throws FetchError<401, types.ChangeCommunitySettingsResponse401> Need channel authorization for update group settings
     * @throws FetchError<403, types.ChangeCommunitySettingsResponse403> You do not have permissions for this action
     * @throws FetchError<404, types.ChangeCommunitySettingsResponse404> Specified community not found
     * @throws FetchError<500, types.ChangeCommunitySettingsResponse500> Internal Error
     */
    SDK.prototype.changeCommunitySettings = function (body, metadata) {
        return this.core.fetch('/communities/{CommunityID}/settings', 'patch', body, metadata);
    };
    /**
     * This method is responsible for add participants community.
     *
     * @summary Add participants to community
     * @throws FetchError<400, types.AddCommunityParticipantResponse400> Wrong request parameters
     * @throws FetchError<401, types.AddCommunityParticipantResponse401> Need channel authorization
     * @throws FetchError<403, types.AddCommunityParticipantResponse403> Not permission
     * @throws FetchError<404, types.AddCommunityParticipantResponse404> Community not found
     * @throws FetchError<500, types.AddCommunityParticipantResponse500> Internal Error
     */
    SDK.prototype.addCommunityParticipant = function (body, metadata) {
        return this.core.fetch('/communities/{CommunityID}/participants', 'post', body, metadata);
    };
    /**
     * This method is responsible for remove paricipants from community.
     *
     * @summary Remove participants from community
     * @throws FetchError<400, types.RemoveCommunityParticipantResponse400> Wrong request parameters
     * @throws FetchError<401, types.RemoveCommunityParticipantResponse401> Need channel authorization
     * @throws FetchError<403, types.RemoveCommunityParticipantResponse403> Not permission
     * @throws FetchError<404, types.RemoveCommunityParticipantResponse404> Community not found
     * @throws FetchError<500, types.RemoveCommunityParticipantResponse500> Internal Error
     */
    SDK.prototype.removeCommunityParticipant = function (body, metadata) {
        return this.core.fetch('/communities/{CommunityID}/participants', 'delete', body, metadata);
    };
    /**
     * This method is responsible for get a community subgroups. [Learn more about the nuances
     * of community:](https://support.whapi.cloud/help-desk/communities/introduction)
     *
     * @summary Get community subgroups
     * @throws FetchError<400, types.GetCommunitySubGroupsResponse400> Wrong request parameters
     * @throws FetchError<401, types.GetCommunitySubGroupsResponse401> Need channel authorization to get info
     * @throws FetchError<404, types.GetCommunitySubGroupsResponse404> Community not found
     * @throws FetchError<500, types.GetCommunitySubGroupsResponse500> Internal Error
     */
    SDK.prototype.getCommunitySubGroups = function (metadata) {
        return this.core.fetch('/communities/{CommunityID}/subGroups', 'get', metadata);
    };
    return SDK;
}());
var createSDK = (function () { return new SDK(); })();
module.exports = createSDK;

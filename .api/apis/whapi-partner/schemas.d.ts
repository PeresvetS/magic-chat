declare const ChangeChannelMode: {
    readonly body: {
        readonly title: "Change Channel Mode request";
        readonly type: "object";
        readonly properties: {
            readonly mode: {
                readonly title: "Channel mode";
                readonly type: "string";
                readonly description: "Channel mode, if empty - live";
                readonly enum: readonly ["trial", "dev", "dev_archive", "live"];
            };
        };
        readonly $schema: "http://json-schema.org/draft-04/schema#";
    };
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly ChannelID: {
                    readonly type: "string";
                    readonly description: "Channel ID";
                    readonly pattern: "^(?:[A-Z]{6}-[A-Z0-9]{5}|[A-Z0-9]{12})$";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                };
            };
            readonly required: readonly ["ChannelID"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly title: "ResponseSuccess";
            readonly type: "object";
            readonly properties: {
                readonly success: {
                    readonly type: "boolean";
                };
            };
            readonly required: readonly ["result"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "400": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "403": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "404": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "500": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
    };
};
declare const CreateChannel: {
    readonly body: {
        readonly title: "Channel custom fields";
        readonly type: "object";
        readonly properties: {
            readonly name: {
                readonly type: "string";
                readonly description: "Name of the channel";
                readonly examples: readonly ["My Channel"];
            };
            readonly phone: {
                readonly type: "string";
                readonly description: "Contact ID";
                readonly pattern: "^([\\d]{7,15})?$";
            };
            readonly projectId: {
                readonly type: "string";
                readonly description: "Identifier for the project associated with the channel";
                readonly examples: readonly ["project123"];
            };
            readonly recurrentPaymentId: {
                readonly type: "string";
                readonly description: "Identifier for the channel recurrent payment";
                readonly examples: readonly ["1z5dc43s4d6"];
            };
            readonly prevRecurrentPaymentId: {
                readonly type: "string";
                readonly description: "Identifier for the previous channel recurrent payment";
                readonly examples: readonly ["asd65465465"];
            };
        };
        readonly required: readonly ["name", "projectId"];
        readonly $schema: "http://json-schema.org/draft-04/schema#";
    };
    readonly response: {
        readonly "200": {
            readonly title: "Channel";
            readonly type: "object";
            readonly required: readonly ["activeTill", "apiUrl", "creationTS", "id", "name", "ownerId", "projectId", "server", "stopped", "token"];
            readonly properties: {
                readonly activeTill: {
                    readonly type: "integer";
                    readonly description: "Timestamp till when the channel is active";
                    readonly examples: readonly [1640995200];
                };
                readonly apiUrl: {
                    readonly type: "string";
                    readonly description: "API endpoint for the channel";
                    readonly examples: readonly ["https://api.mychannel.com"];
                };
                readonly creationTS: {
                    readonly type: "integer";
                    readonly description: "Timestamp of the channel creation";
                    readonly examples: readonly [1640995200];
                };
                readonly id: {
                    readonly type: "string";
                    readonly description: "Channel ID";
                    readonly pattern: "^(?:[A-Z]{6}-[A-Z0-9]{5}|[A-Z0-9]{12})$";
                };
                readonly ownerId: {
                    readonly type: "string";
                    readonly description: "User ID";
                    readonly pattern: "^(?:[a-zA-Z0-9]{28}|me)$";
                };
                readonly server: {
                    readonly type: "integer";
                    readonly description: "Server number hosting the channel";
                    readonly examples: readonly [1];
                };
                readonly token: {
                    readonly type: "string";
                    readonly description: "Channel token";
                    readonly pattern: "^[a-zA-Z0-9]{32}$";
                };
                readonly stopped: {
                    readonly type: "boolean";
                    readonly description: "Indicates if the channel is stopped";
                    readonly examples: readonly [false];
                };
                readonly trial: {
                    readonly type: readonly ["integer", "null"];
                    readonly description: "Timestamp till when the trial period for the channel is active";
                    readonly examples: readonly [1640995200];
                };
                readonly blocked: {
                    readonly type: readonly ["boolean", "null"];
                    readonly description: "Indicates if the channel is blocked";
                    readonly examples: readonly [false];
                };
                readonly proxy: {
                    readonly title: "Channel proxy";
                    readonly type: "object";
                    readonly required: readonly ["host", "port"];
                    readonly properties: {
                        readonly host: {
                            readonly type: "string";
                            readonly description: "Host of the proxy";
                            readonly examples: readonly ["1.1.1.1"];
                        };
                        readonly port: {
                            readonly type: "integer";
                            readonly description: "Port of the proxy";
                            readonly examples: readonly [8080];
                        };
                        readonly auth: {
                            readonly type: "string";
                            readonly description: "Authentication of the proxy";
                            readonly examples: readonly ["user:password"];
                        };
                    };
                };
                readonly status: {
                    readonly type: readonly ["string", "null"];
                    readonly description: "Status of the channel";
                    readonly examples: readonly ["active"];
                };
                readonly mode: {
                    readonly title: "Channel mode";
                    readonly type: "string";
                    readonly description: "Channel mode, if empty - live\n\n`trial` `dev` `dev_archive` `live`";
                    readonly enum: readonly ["trial", "dev", "dev_archive", "live"];
                };
                readonly name: {
                    readonly type: "string";
                    readonly description: "Name of the channel";
                    readonly examples: readonly ["My Channel"];
                };
                readonly phone: {
                    readonly type: "string";
                    readonly description: "Contact ID";
                    readonly pattern: "^([\\d]{7,15})?$";
                };
                readonly projectId: {
                    readonly type: "string";
                    readonly description: "Identifier for the project associated with the channel";
                    readonly examples: readonly ["project123"];
                };
                readonly recurrentPaymentId: {
                    readonly type: "string";
                    readonly description: "Identifier for the channel recurrent payment";
                    readonly examples: readonly ["1z5dc43s4d6"];
                };
                readonly prevRecurrentPaymentId: {
                    readonly type: "string";
                    readonly description: "Identifier for the previous channel recurrent payment";
                    readonly examples: readonly ["asd65465465"];
                };
            };
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "400": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "404": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "500": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "503": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
    };
};
declare const CreateProject: {
    readonly body: {
        readonly title: "Project custom fields";
        readonly type: "object";
        readonly properties: {
            readonly name: {
                readonly type: "string";
                readonly description: "Name of the project";
                readonly examples: readonly ["My Project"];
            };
        };
        readonly required: readonly ["name"];
        readonly $schema: "http://json-schema.org/draft-04/schema#";
    };
    readonly response: {
        readonly "200": {
            readonly title: "Project";
            readonly type: "object";
            readonly required: readonly ["creationTS", "id", "name", "ownerId", "users"];
            readonly properties: {
                readonly channels: {
                    readonly title: "Channels";
                    readonly type: "array";
                    readonly items: {
                        readonly title: "Channel";
                        readonly type: "object";
                        readonly required: readonly ["activeTill", "apiUrl", "creationTS", "id", "name", "ownerId", "projectId", "server", "stopped", "token"];
                        readonly properties: {
                            readonly activeTill: {
                                readonly type: "integer";
                                readonly description: "Timestamp till when the channel is active";
                                readonly examples: readonly [1640995200];
                            };
                            readonly apiUrl: {
                                readonly type: "string";
                                readonly description: "API endpoint for the channel";
                                readonly examples: readonly ["https://api.mychannel.com"];
                            };
                            readonly creationTS: {
                                readonly type: "integer";
                                readonly description: "Timestamp of the channel creation";
                                readonly examples: readonly [1640995200];
                            };
                            readonly id: {
                                readonly type: "string";
                                readonly description: "Channel ID";
                                readonly pattern: "^(?:[A-Z]{6}-[A-Z0-9]{5}|[A-Z0-9]{12})$";
                            };
                            readonly ownerId: {
                                readonly type: "string";
                                readonly description: "User ID";
                                readonly pattern: "^(?:[a-zA-Z0-9]{28}|me)$";
                            };
                            readonly server: {
                                readonly type: "integer";
                                readonly description: "Server number hosting the channel";
                                readonly examples: readonly [1];
                            };
                            readonly token: {
                                readonly type: "string";
                                readonly description: "Channel token";
                                readonly pattern: "^[a-zA-Z0-9]{32}$";
                            };
                            readonly stopped: {
                                readonly type: "boolean";
                                readonly description: "Indicates if the channel is stopped";
                                readonly examples: readonly [false];
                            };
                            readonly trial: {
                                readonly type: readonly ["integer", "null"];
                                readonly description: "Timestamp till when the trial period for the channel is active";
                                readonly examples: readonly [1640995200];
                            };
                            readonly blocked: {
                                readonly type: readonly ["boolean", "null"];
                                readonly description: "Indicates if the channel is blocked";
                                readonly examples: readonly [false];
                            };
                            readonly proxy: {
                                readonly title: "Channel proxy";
                                readonly type: "object";
                                readonly required: readonly ["host", "port"];
                                readonly properties: {
                                    readonly host: {
                                        readonly type: "string";
                                        readonly description: "Host of the proxy";
                                        readonly examples: readonly ["1.1.1.1"];
                                    };
                                    readonly port: {
                                        readonly type: "integer";
                                        readonly description: "Port of the proxy";
                                        readonly examples: readonly [8080];
                                    };
                                    readonly auth: {
                                        readonly type: "string";
                                        readonly description: "Authentication of the proxy";
                                        readonly examples: readonly ["user:password"];
                                    };
                                };
                            };
                            readonly status: {
                                readonly type: readonly ["string", "null"];
                                readonly description: "Status of the channel";
                                readonly examples: readonly ["active"];
                            };
                            readonly mode: {
                                readonly title: "Channel mode";
                                readonly type: "string";
                                readonly description: "Channel mode, if empty - live\n\n`trial` `dev` `dev_archive` `live`";
                                readonly enum: readonly ["trial", "dev", "dev_archive", "live"];
                            };
                            readonly name: {
                                readonly type: "string";
                                readonly description: "Name of the channel";
                                readonly examples: readonly ["My Channel"];
                            };
                            readonly phone: {
                                readonly type: "string";
                                readonly description: "Contact ID";
                                readonly pattern: "^([\\d]{7,15})?$";
                            };
                            readonly projectId: {
                                readonly type: "string";
                                readonly description: "Identifier for the project associated with the channel";
                                readonly examples: readonly ["project123"];
                            };
                            readonly recurrentPaymentId: {
                                readonly type: "string";
                                readonly description: "Identifier for the channel recurrent payment";
                                readonly examples: readonly ["1z5dc43s4d6"];
                            };
                            readonly prevRecurrentPaymentId: {
                                readonly type: "string";
                                readonly description: "Identifier for the previous channel recurrent payment";
                                readonly examples: readonly ["asd65465465"];
                            };
                        };
                    };
                };
                readonly creationTS: {
                    readonly type: "integer";
                    readonly description: "Timestamp when the project was created";
                    readonly examples: readonly [1640995200];
                };
                readonly id: {
                    readonly type: "string";
                    readonly description: "Project ID";
                    readonly pattern: "^(?:[a-zA-Z0-9]{20}|default)$";
                };
                readonly isDefault: {
                    readonly type: "boolean";
                    readonly description: "Indicates whether the project is the default one";
                    readonly examples: readonly [true];
                };
                readonly ownerId: {
                    readonly type: "string";
                    readonly description: "User ID";
                    readonly pattern: "^(?:[a-zA-Z0-9]{28}|me)$";
                };
                readonly users: {
                    readonly type: "array";
                    readonly description: "Array of user identifiers associated with the project";
                    readonly items: {
                        readonly type: "string";
                        readonly description: "User ID";
                        readonly pattern: "^(?:[a-zA-Z0-9]{28}|me)$";
                    };
                    readonly examples: readonly ["UaAjPEY8ugiHw62MNEoWT7W6XR"];
                };
                readonly name: {
                    readonly type: "string";
                    readonly description: "Name of the project";
                    readonly examples: readonly ["My Project"];
                };
            };
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "400": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "500": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
    };
};
declare const DeleteChannel: {
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly ChannelID: {
                    readonly type: "string";
                    readonly description: "Channel ID";
                    readonly pattern: "^(?:[A-Z]{6}-[A-Z0-9]{5}|[A-Z0-9]{12})$";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                };
            };
            readonly required: readonly ["ChannelID"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly title: "ResponseSuccess";
            readonly type: "object";
            readonly properties: {
                readonly success: {
                    readonly type: "boolean";
                };
            };
            readonly required: readonly ["result"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "400": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "404": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "500": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
    };
};
declare const DeleteProject: {
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly ProjectID: {
                    readonly type: "string";
                    readonly description: "Project ID";
                    readonly pattern: "^(?:[a-zA-Z0-9]{20}|default)$";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                };
            };
            readonly required: readonly ["ProjectID"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly title: "ResponseSuccess";
            readonly type: "object";
            readonly properties: {
                readonly success: {
                    readonly type: "boolean";
                };
            };
            readonly required: readonly ["result"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "400": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "404": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "500": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
    };
};
declare const ExtendChannel: {
    readonly body: {
        readonly title: "Extend Channel";
        readonly type: "object";
        readonly required: readonly ["days", "comment"];
        readonly properties: {
            readonly days: {
                readonly type: "number";
            };
            readonly comment: {
                readonly type: "string";
            };
            readonly amount: {
                readonly type: "number";
            };
            readonly currency: {
                readonly type: "string";
                readonly enum: readonly ["USD", "RUB", "BRL", "MXN", "INR"];
            };
        };
        readonly $schema: "http://json-schema.org/draft-04/schema#";
    };
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly ChannelID: {
                    readonly type: "string";
                    readonly description: "Channel ID";
                    readonly pattern: "^(?:[A-Z]{6}-[A-Z0-9]{5}|[A-Z0-9]{12})$";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                };
            };
            readonly required: readonly ["ChannelID"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly title: "ResponseSuccess";
            readonly type: "object";
            readonly properties: {
                readonly success: {
                    readonly type: "boolean";
                };
            };
            readonly required: readonly ["result"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "400": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "404": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "500": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "503": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
    };
};
declare const GetChannel: {
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly ChannelID: {
                    readonly type: "string";
                    readonly description: "Channel ID";
                    readonly pattern: "^(?:[A-Z]{6}-[A-Z0-9]{5}|[A-Z0-9]{12})$";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                };
            };
            readonly required: readonly ["ChannelID"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly title: "Channel";
            readonly type: "object";
            readonly required: readonly ["activeTill", "apiUrl", "creationTS", "id", "name", "ownerId", "projectId", "server", "stopped", "token"];
            readonly properties: {
                readonly activeTill: {
                    readonly type: "integer";
                    readonly description: "Timestamp till when the channel is active";
                    readonly examples: readonly [1640995200];
                };
                readonly apiUrl: {
                    readonly type: "string";
                    readonly description: "API endpoint for the channel";
                    readonly examples: readonly ["https://api.mychannel.com"];
                };
                readonly creationTS: {
                    readonly type: "integer";
                    readonly description: "Timestamp of the channel creation";
                    readonly examples: readonly [1640995200];
                };
                readonly id: {
                    readonly type: "string";
                    readonly description: "Channel ID";
                    readonly pattern: "^(?:[A-Z]{6}-[A-Z0-9]{5}|[A-Z0-9]{12})$";
                };
                readonly ownerId: {
                    readonly type: "string";
                    readonly description: "User ID";
                    readonly pattern: "^(?:[a-zA-Z0-9]{28}|me)$";
                };
                readonly server: {
                    readonly type: "integer";
                    readonly description: "Server number hosting the channel";
                    readonly examples: readonly [1];
                };
                readonly token: {
                    readonly type: "string";
                    readonly description: "Channel token";
                    readonly pattern: "^[a-zA-Z0-9]{32}$";
                };
                readonly stopped: {
                    readonly type: "boolean";
                    readonly description: "Indicates if the channel is stopped";
                    readonly examples: readonly [false];
                };
                readonly trial: {
                    readonly type: readonly ["integer", "null"];
                    readonly description: "Timestamp till when the trial period for the channel is active";
                    readonly examples: readonly [1640995200];
                };
                readonly blocked: {
                    readonly type: readonly ["boolean", "null"];
                    readonly description: "Indicates if the channel is blocked";
                    readonly examples: readonly [false];
                };
                readonly proxy: {
                    readonly title: "Channel proxy";
                    readonly type: "object";
                    readonly required: readonly ["host", "port"];
                    readonly properties: {
                        readonly host: {
                            readonly type: "string";
                            readonly description: "Host of the proxy";
                            readonly examples: readonly ["1.1.1.1"];
                        };
                        readonly port: {
                            readonly type: "integer";
                            readonly description: "Port of the proxy";
                            readonly examples: readonly [8080];
                        };
                        readonly auth: {
                            readonly type: "string";
                            readonly description: "Authentication of the proxy";
                            readonly examples: readonly ["user:password"];
                        };
                    };
                };
                readonly status: {
                    readonly type: readonly ["string", "null"];
                    readonly description: "Status of the channel";
                    readonly examples: readonly ["active"];
                };
                readonly mode: {
                    readonly title: "Channel mode";
                    readonly type: "string";
                    readonly description: "Channel mode, if empty - live\n\n`trial` `dev` `dev_archive` `live`";
                    readonly enum: readonly ["trial", "dev", "dev_archive", "live"];
                };
                readonly name: {
                    readonly type: "string";
                    readonly description: "Name of the channel";
                    readonly examples: readonly ["My Channel"];
                };
                readonly phone: {
                    readonly type: "string";
                    readonly description: "Contact ID";
                    readonly pattern: "^([\\d]{7,15})?$";
                };
                readonly projectId: {
                    readonly type: "string";
                    readonly description: "Identifier for the project associated with the channel";
                    readonly examples: readonly ["project123"];
                };
                readonly recurrentPaymentId: {
                    readonly type: "string";
                    readonly description: "Identifier for the channel recurrent payment";
                    readonly examples: readonly ["1z5dc43s4d6"];
                };
                readonly prevRecurrentPaymentId: {
                    readonly type: "string";
                    readonly description: "Identifier for the previous channel recurrent payment";
                    readonly examples: readonly ["asd65465465"];
                };
            };
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "400": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "404": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "500": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
    };
};
declare const GetChannels: {
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly uid: {
                    readonly type: "string";
                    readonly description: "User ID";
                    readonly pattern: "^(?:[a-zA-Z0-9]{28}|me)$";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                };
                readonly count: {
                    readonly type: "number";
                    readonly minimum: 1;
                    readonly maximum: 500;
                    readonly default: 100;
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Count of objects to return";
                };
                readonly offset: {
                    readonly type: "number";
                    readonly minimum: 0;
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Offset of objects to return";
                };
            };
            readonly required: readonly [];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly title: "List of channels";
            readonly type: "object";
            readonly properties: {
                readonly channels: {
                    readonly title: "Channels";
                    readonly type: "array";
                    readonly items: {
                        readonly title: "Channel";
                        readonly type: "object";
                        readonly required: readonly ["activeTill", "apiUrl", "creationTS", "id", "name", "ownerId", "projectId", "server", "stopped", "token"];
                        readonly properties: {
                            readonly activeTill: {
                                readonly type: "integer";
                                readonly description: "Timestamp till when the channel is active";
                                readonly examples: readonly [1640995200];
                            };
                            readonly apiUrl: {
                                readonly type: "string";
                                readonly description: "API endpoint for the channel";
                                readonly examples: readonly ["https://api.mychannel.com"];
                            };
                            readonly creationTS: {
                                readonly type: "integer";
                                readonly description: "Timestamp of the channel creation";
                                readonly examples: readonly [1640995200];
                            };
                            readonly id: {
                                readonly type: "string";
                                readonly description: "Channel ID";
                                readonly pattern: "^(?:[A-Z]{6}-[A-Z0-9]{5}|[A-Z0-9]{12})$";
                            };
                            readonly ownerId: {
                                readonly type: "string";
                                readonly description: "User ID";
                                readonly pattern: "^(?:[a-zA-Z0-9]{28}|me)$";
                            };
                            readonly server: {
                                readonly type: "integer";
                                readonly description: "Server number hosting the channel";
                                readonly examples: readonly [1];
                            };
                            readonly token: {
                                readonly type: "string";
                                readonly description: "Channel token";
                                readonly pattern: "^[a-zA-Z0-9]{32}$";
                            };
                            readonly stopped: {
                                readonly type: "boolean";
                                readonly description: "Indicates if the channel is stopped";
                                readonly examples: readonly [false];
                            };
                            readonly trial: {
                                readonly type: readonly ["integer", "null"];
                                readonly description: "Timestamp till when the trial period for the channel is active";
                                readonly examples: readonly [1640995200];
                            };
                            readonly blocked: {
                                readonly type: readonly ["boolean", "null"];
                                readonly description: "Indicates if the channel is blocked";
                                readonly examples: readonly [false];
                            };
                            readonly proxy: {
                                readonly title: "Channel proxy";
                                readonly type: "object";
                                readonly required: readonly ["host", "port"];
                                readonly properties: {
                                    readonly host: {
                                        readonly type: "string";
                                        readonly description: "Host of the proxy";
                                        readonly examples: readonly ["1.1.1.1"];
                                    };
                                    readonly port: {
                                        readonly type: "integer";
                                        readonly description: "Port of the proxy";
                                        readonly examples: readonly [8080];
                                    };
                                    readonly auth: {
                                        readonly type: "string";
                                        readonly description: "Authentication of the proxy";
                                        readonly examples: readonly ["user:password"];
                                    };
                                };
                            };
                            readonly status: {
                                readonly type: readonly ["string", "null"];
                                readonly description: "Status of the channel";
                                readonly examples: readonly ["active"];
                            };
                            readonly mode: {
                                readonly title: "Channel mode";
                                readonly type: "string";
                                readonly description: "Channel mode, if empty - live\n\n`trial` `dev` `dev_archive` `live`";
                                readonly enum: readonly ["trial", "dev", "dev_archive", "live"];
                            };
                            readonly name: {
                                readonly type: "string";
                                readonly description: "Name of the channel";
                                readonly examples: readonly ["My Channel"];
                            };
                            readonly phone: {
                                readonly type: "string";
                                readonly description: "Contact ID";
                                readonly pattern: "^([\\d]{7,15})?$";
                            };
                            readonly projectId: {
                                readonly type: "string";
                                readonly description: "Identifier for the project associated with the channel";
                                readonly examples: readonly ["project123"];
                            };
                            readonly recurrentPaymentId: {
                                readonly type: "string";
                                readonly description: "Identifier for the channel recurrent payment";
                                readonly examples: readonly ["1z5dc43s4d6"];
                            };
                            readonly prevRecurrentPaymentId: {
                                readonly type: "string";
                                readonly description: "Identifier for the previous channel recurrent payment";
                                readonly examples: readonly ["asd65465465"];
                            };
                        };
                    };
                };
                readonly count: {
                    readonly type: "integer";
                    readonly format: "int32";
                    readonly description: "Count of requested chats";
                    readonly default: 20;
                    readonly minimum: -2147483648;
                    readonly maximum: 2147483647;
                };
                readonly total: {
                    readonly type: "integer";
                    readonly format: "int32";
                    readonly description: "Total number of returned chats";
                    readonly minimum: -2147483648;
                    readonly maximum: 2147483647;
                };
                readonly offset: {
                    readonly type: "integer";
                    readonly format: "int32";
                    readonly description: "Offset of requested chats";
                    readonly default: 0;
                    readonly minimum: -2147483648;
                    readonly maximum: 2147483647;
                };
            };
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "400": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "500": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
    };
};
declare const GetChannelsByProjectId: {
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly ProjectID: {
                    readonly type: "string";
                    readonly description: "Project ID";
                    readonly pattern: "^(?:[a-zA-Z0-9]{20}|default)$";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                };
            };
            readonly required: readonly ["ProjectID"];
        }, {
            readonly type: "object";
            readonly properties: {
                readonly count: {
                    readonly type: "number";
                    readonly minimum: 1;
                    readonly maximum: 500;
                    readonly default: 100;
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Count of objects to return";
                };
                readonly offset: {
                    readonly type: "number";
                    readonly minimum: 0;
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Offset of objects to return";
                };
            };
            readonly required: readonly [];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly title: "List of channels";
            readonly type: "object";
            readonly properties: {
                readonly channels: {
                    readonly title: "Channels";
                    readonly type: "array";
                    readonly items: {
                        readonly title: "Channel";
                        readonly type: "object";
                        readonly required: readonly ["activeTill", "apiUrl", "creationTS", "id", "name", "ownerId", "projectId", "server", "stopped", "token"];
                        readonly properties: {
                            readonly activeTill: {
                                readonly type: "integer";
                                readonly description: "Timestamp till when the channel is active";
                                readonly examples: readonly [1640995200];
                            };
                            readonly apiUrl: {
                                readonly type: "string";
                                readonly description: "API endpoint for the channel";
                                readonly examples: readonly ["https://api.mychannel.com"];
                            };
                            readonly creationTS: {
                                readonly type: "integer";
                                readonly description: "Timestamp of the channel creation";
                                readonly examples: readonly [1640995200];
                            };
                            readonly id: {
                                readonly type: "string";
                                readonly description: "Channel ID";
                                readonly pattern: "^(?:[A-Z]{6}-[A-Z0-9]{5}|[A-Z0-9]{12})$";
                            };
                            readonly ownerId: {
                                readonly type: "string";
                                readonly description: "User ID";
                                readonly pattern: "^(?:[a-zA-Z0-9]{28}|me)$";
                            };
                            readonly server: {
                                readonly type: "integer";
                                readonly description: "Server number hosting the channel";
                                readonly examples: readonly [1];
                            };
                            readonly token: {
                                readonly type: "string";
                                readonly description: "Channel token";
                                readonly pattern: "^[a-zA-Z0-9]{32}$";
                            };
                            readonly stopped: {
                                readonly type: "boolean";
                                readonly description: "Indicates if the channel is stopped";
                                readonly examples: readonly [false];
                            };
                            readonly trial: {
                                readonly type: readonly ["integer", "null"];
                                readonly description: "Timestamp till when the trial period for the channel is active";
                                readonly examples: readonly [1640995200];
                            };
                            readonly blocked: {
                                readonly type: readonly ["boolean", "null"];
                                readonly description: "Indicates if the channel is blocked";
                                readonly examples: readonly [false];
                            };
                            readonly proxy: {
                                readonly title: "Channel proxy";
                                readonly type: "object";
                                readonly required: readonly ["host", "port"];
                                readonly properties: {
                                    readonly host: {
                                        readonly type: "string";
                                        readonly description: "Host of the proxy";
                                        readonly examples: readonly ["1.1.1.1"];
                                    };
                                    readonly port: {
                                        readonly type: "integer";
                                        readonly description: "Port of the proxy";
                                        readonly examples: readonly [8080];
                                    };
                                    readonly auth: {
                                        readonly type: "string";
                                        readonly description: "Authentication of the proxy";
                                        readonly examples: readonly ["user:password"];
                                    };
                                };
                            };
                            readonly status: {
                                readonly type: readonly ["string", "null"];
                                readonly description: "Status of the channel";
                                readonly examples: readonly ["active"];
                            };
                            readonly mode: {
                                readonly title: "Channel mode";
                                readonly type: "string";
                                readonly description: "Channel mode, if empty - live\n\n`trial` `dev` `dev_archive` `live`";
                                readonly enum: readonly ["trial", "dev", "dev_archive", "live"];
                            };
                            readonly name: {
                                readonly type: "string";
                                readonly description: "Name of the channel";
                                readonly examples: readonly ["My Channel"];
                            };
                            readonly phone: {
                                readonly type: "string";
                                readonly description: "Contact ID";
                                readonly pattern: "^([\\d]{7,15})?$";
                            };
                            readonly projectId: {
                                readonly type: "string";
                                readonly description: "Identifier for the project associated with the channel";
                                readonly examples: readonly ["project123"];
                            };
                            readonly recurrentPaymentId: {
                                readonly type: "string";
                                readonly description: "Identifier for the channel recurrent payment";
                                readonly examples: readonly ["1z5dc43s4d6"];
                            };
                            readonly prevRecurrentPaymentId: {
                                readonly type: "string";
                                readonly description: "Identifier for the previous channel recurrent payment";
                                readonly examples: readonly ["asd65465465"];
                            };
                        };
                    };
                };
                readonly count: {
                    readonly type: "integer";
                    readonly format: "int32";
                    readonly description: "Count of requested chats";
                    readonly default: 20;
                    readonly minimum: -2147483648;
                    readonly maximum: 2147483647;
                };
                readonly total: {
                    readonly type: "integer";
                    readonly format: "int32";
                    readonly description: "Total number of returned chats";
                    readonly minimum: -2147483648;
                    readonly maximum: 2147483647;
                };
                readonly offset: {
                    readonly type: "integer";
                    readonly format: "int32";
                    readonly description: "Offset of requested chats";
                    readonly default: 0;
                    readonly minimum: -2147483648;
                    readonly maximum: 2147483647;
                };
            };
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "400": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "404": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "500": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
    };
};
declare const GetPartnerSettings: {
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly PartnerName: {
                    readonly type: "string";
                    readonly description: "Partner Name";
                    readonly pattern: "^[a-zA-Z0-9_-]*$";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                };
            };
            readonly required: readonly ["PartnerName"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly title: "Partner Settings";
            readonly type: "object";
            readonly properties: {
                readonly webhooks: {
                    readonly title: "Partner Webhooks";
                    readonly type: "array";
                    readonly items: {
                        readonly title: "Partner Webhook";
                        readonly type: "object";
                        readonly required: readonly ["url"];
                        readonly properties: {
                            readonly url: {
                                readonly description: "Inbound and outbound partner notifications are routed to this URL.";
                                readonly type: "string";
                            };
                            readonly events: {
                                readonly type: "array";
                                readonly items: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly type: {
                                            readonly type: "string";
                                            readonly enum: readonly ["days"];
                                            readonly description: "`days`";
                                        };
                                        readonly method: {
                                            readonly type: "string";
                                            readonly enum: readonly ["post"];
                                            readonly description: "`post`";
                                        };
                                    };
                                };
                                readonly default: readonly [{
                                    readonly type: "days";
                                    readonly method: "post";
                                }];
                                readonly description: "Tracked events. <br/>\"days\" - Remaining days count lower than 7;";
                            };
                            readonly mode: {
                                readonly type: "string";
                                readonly default: "body";
                                readonly enum: readonly ["body", "path", "method"];
                                readonly description: "Request method for sending hook.\n\n`body` `path` `method`";
                            };
                        };
                    };
                };
                readonly days_limit: {
                    readonly description: "Remaining days limit, after when webhook will be send";
                    readonly type: "number";
                };
                readonly noChat: {
                    readonly type: "boolean";
                    readonly description: "Turn off live chat for user";
                };
            };
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "400": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "403": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "500": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
    };
};
declare const GetProject: {
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly ProjectID: {
                    readonly type: "string";
                    readonly description: "Project ID";
                    readonly pattern: "^(?:[a-zA-Z0-9]{20}|default)$";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                };
            };
            readonly required: readonly ["ProjectID"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly title: "Project";
            readonly type: "object";
            readonly required: readonly ["creationTS", "id", "name", "ownerId", "users"];
            readonly properties: {
                readonly channels: {
                    readonly title: "Channels";
                    readonly type: "array";
                    readonly items: {
                        readonly title: "Channel";
                        readonly type: "object";
                        readonly required: readonly ["activeTill", "apiUrl", "creationTS", "id", "name", "ownerId", "projectId", "server", "stopped", "token"];
                        readonly properties: {
                            readonly activeTill: {
                                readonly type: "integer";
                                readonly description: "Timestamp till when the channel is active";
                                readonly examples: readonly [1640995200];
                            };
                            readonly apiUrl: {
                                readonly type: "string";
                                readonly description: "API endpoint for the channel";
                                readonly examples: readonly ["https://api.mychannel.com"];
                            };
                            readonly creationTS: {
                                readonly type: "integer";
                                readonly description: "Timestamp of the channel creation";
                                readonly examples: readonly [1640995200];
                            };
                            readonly id: {
                                readonly type: "string";
                                readonly description: "Channel ID";
                                readonly pattern: "^(?:[A-Z]{6}-[A-Z0-9]{5}|[A-Z0-9]{12})$";
                            };
                            readonly ownerId: {
                                readonly type: "string";
                                readonly description: "User ID";
                                readonly pattern: "^(?:[a-zA-Z0-9]{28}|me)$";
                            };
                            readonly server: {
                                readonly type: "integer";
                                readonly description: "Server number hosting the channel";
                                readonly examples: readonly [1];
                            };
                            readonly token: {
                                readonly type: "string";
                                readonly description: "Channel token";
                                readonly pattern: "^[a-zA-Z0-9]{32}$";
                            };
                            readonly stopped: {
                                readonly type: "boolean";
                                readonly description: "Indicates if the channel is stopped";
                                readonly examples: readonly [false];
                            };
                            readonly trial: {
                                readonly type: readonly ["integer", "null"];
                                readonly description: "Timestamp till when the trial period for the channel is active";
                                readonly examples: readonly [1640995200];
                            };
                            readonly blocked: {
                                readonly type: readonly ["boolean", "null"];
                                readonly description: "Indicates if the channel is blocked";
                                readonly examples: readonly [false];
                            };
                            readonly proxy: {
                                readonly title: "Channel proxy";
                                readonly type: "object";
                                readonly required: readonly ["host", "port"];
                                readonly properties: {
                                    readonly host: {
                                        readonly type: "string";
                                        readonly description: "Host of the proxy";
                                        readonly examples: readonly ["1.1.1.1"];
                                    };
                                    readonly port: {
                                        readonly type: "integer";
                                        readonly description: "Port of the proxy";
                                        readonly examples: readonly [8080];
                                    };
                                    readonly auth: {
                                        readonly type: "string";
                                        readonly description: "Authentication of the proxy";
                                        readonly examples: readonly ["user:password"];
                                    };
                                };
                            };
                            readonly status: {
                                readonly type: readonly ["string", "null"];
                                readonly description: "Status of the channel";
                                readonly examples: readonly ["active"];
                            };
                            readonly mode: {
                                readonly title: "Channel mode";
                                readonly type: "string";
                                readonly description: "Channel mode, if empty - live\n\n`trial` `dev` `dev_archive` `live`";
                                readonly enum: readonly ["trial", "dev", "dev_archive", "live"];
                            };
                            readonly name: {
                                readonly type: "string";
                                readonly description: "Name of the channel";
                                readonly examples: readonly ["My Channel"];
                            };
                            readonly phone: {
                                readonly type: "string";
                                readonly description: "Contact ID";
                                readonly pattern: "^([\\d]{7,15})?$";
                            };
                            readonly projectId: {
                                readonly type: "string";
                                readonly description: "Identifier for the project associated with the channel";
                                readonly examples: readonly ["project123"];
                            };
                            readonly recurrentPaymentId: {
                                readonly type: "string";
                                readonly description: "Identifier for the channel recurrent payment";
                                readonly examples: readonly ["1z5dc43s4d6"];
                            };
                            readonly prevRecurrentPaymentId: {
                                readonly type: "string";
                                readonly description: "Identifier for the previous channel recurrent payment";
                                readonly examples: readonly ["asd65465465"];
                            };
                        };
                    };
                };
                readonly creationTS: {
                    readonly type: "integer";
                    readonly description: "Timestamp when the project was created";
                    readonly examples: readonly [1640995200];
                };
                readonly id: {
                    readonly type: "string";
                    readonly description: "Project ID";
                    readonly pattern: "^(?:[a-zA-Z0-9]{20}|default)$";
                };
                readonly isDefault: {
                    readonly type: "boolean";
                    readonly description: "Indicates whether the project is the default one";
                    readonly examples: readonly [true];
                };
                readonly ownerId: {
                    readonly type: "string";
                    readonly description: "User ID";
                    readonly pattern: "^(?:[a-zA-Z0-9]{28}|me)$";
                };
                readonly users: {
                    readonly type: "array";
                    readonly description: "Array of user identifiers associated with the project";
                    readonly items: {
                        readonly type: "string";
                        readonly description: "User ID";
                        readonly pattern: "^(?:[a-zA-Z0-9]{28}|me)$";
                    };
                    readonly examples: readonly ["UaAjPEY8ugiHw62MNEoWT7W6XR"];
                };
                readonly name: {
                    readonly type: "string";
                    readonly description: "Name of the project";
                    readonly examples: readonly ["My Project"];
                };
            };
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "400": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "404": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "500": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
    };
};
declare const GetProjects: {
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly uid: {
                    readonly type: "string";
                    readonly description: "User ID";
                    readonly pattern: "^(?:[a-zA-Z0-9]{28}|me)$";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                };
                readonly count: {
                    readonly type: "number";
                    readonly minimum: 1;
                    readonly maximum: 500;
                    readonly default: 100;
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Count of objects to return";
                };
                readonly offset: {
                    readonly type: "number";
                    readonly minimum: 0;
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                    readonly description: "Offset of objects to return";
                };
            };
            readonly required: readonly [];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly title: "List of projects";
            readonly type: "object";
            readonly properties: {
                readonly projects: {
                    readonly title: "Projects";
                    readonly type: "array";
                    readonly items: {
                        readonly title: "Project";
                        readonly type: "object";
                        readonly required: readonly ["creationTS", "id", "name", "ownerId", "users"];
                        readonly properties: {
                            readonly channels: {
                                readonly title: "Channels";
                                readonly type: "array";
                                readonly items: {
                                    readonly title: "Channel";
                                    readonly type: "object";
                                    readonly required: readonly ["activeTill", "apiUrl", "creationTS", "id", "name", "ownerId", "projectId", "server", "stopped", "token"];
                                    readonly properties: {
                                        readonly activeTill: {
                                            readonly type: "integer";
                                            readonly description: "Timestamp till when the channel is active";
                                            readonly examples: readonly [1640995200];
                                        };
                                        readonly apiUrl: {
                                            readonly type: "string";
                                            readonly description: "API endpoint for the channel";
                                            readonly examples: readonly ["https://api.mychannel.com"];
                                        };
                                        readonly creationTS: {
                                            readonly type: "integer";
                                            readonly description: "Timestamp of the channel creation";
                                            readonly examples: readonly [1640995200];
                                        };
                                        readonly id: {
                                            readonly type: "string";
                                            readonly description: "Channel ID";
                                            readonly pattern: "^(?:[A-Z]{6}-[A-Z0-9]{5}|[A-Z0-9]{12})$";
                                        };
                                        readonly ownerId: {
                                            readonly type: "string";
                                            readonly description: "User ID";
                                            readonly pattern: "^(?:[a-zA-Z0-9]{28}|me)$";
                                        };
                                        readonly server: {
                                            readonly type: "integer";
                                            readonly description: "Server number hosting the channel";
                                            readonly examples: readonly [1];
                                        };
                                        readonly token: {
                                            readonly type: "string";
                                            readonly description: "Channel token";
                                            readonly pattern: "^[a-zA-Z0-9]{32}$";
                                        };
                                        readonly stopped: {
                                            readonly type: "boolean";
                                            readonly description: "Indicates if the channel is stopped";
                                            readonly examples: readonly [false];
                                        };
                                        readonly trial: {
                                            readonly type: readonly ["integer", "null"];
                                            readonly description: "Timestamp till when the trial period for the channel is active";
                                            readonly examples: readonly [1640995200];
                                        };
                                        readonly blocked: {
                                            readonly type: readonly ["boolean", "null"];
                                            readonly description: "Indicates if the channel is blocked";
                                            readonly examples: readonly [false];
                                        };
                                        readonly proxy: {
                                            readonly title: "Channel proxy";
                                            readonly type: "object";
                                            readonly required: readonly ["host", "port"];
                                            readonly properties: {
                                                readonly host: {
                                                    readonly type: "string";
                                                    readonly description: "Host of the proxy";
                                                    readonly examples: readonly ["1.1.1.1"];
                                                };
                                                readonly port: {
                                                    readonly type: "integer";
                                                    readonly description: "Port of the proxy";
                                                    readonly examples: readonly [8080];
                                                };
                                                readonly auth: {
                                                    readonly type: "string";
                                                    readonly description: "Authentication of the proxy";
                                                    readonly examples: readonly ["user:password"];
                                                };
                                            };
                                        };
                                        readonly status: {
                                            readonly type: readonly ["string", "null"];
                                            readonly description: "Status of the channel";
                                            readonly examples: readonly ["active"];
                                        };
                                        readonly mode: {
                                            readonly title: "Channel mode";
                                            readonly type: "string";
                                            readonly description: "Channel mode, if empty - live\n\n`trial` `dev` `dev_archive` `live`";
                                            readonly enum: readonly ["trial", "dev", "dev_archive", "live"];
                                        };
                                        readonly name: {
                                            readonly type: "string";
                                            readonly description: "Name of the channel";
                                            readonly examples: readonly ["My Channel"];
                                        };
                                        readonly phone: {
                                            readonly type: "string";
                                            readonly description: "Contact ID";
                                            readonly pattern: "^([\\d]{7,15})?$";
                                        };
                                        readonly projectId: {
                                            readonly type: "string";
                                            readonly description: "Identifier for the project associated with the channel";
                                            readonly examples: readonly ["project123"];
                                        };
                                        readonly recurrentPaymentId: {
                                            readonly type: "string";
                                            readonly description: "Identifier for the channel recurrent payment";
                                            readonly examples: readonly ["1z5dc43s4d6"];
                                        };
                                        readonly prevRecurrentPaymentId: {
                                            readonly type: "string";
                                            readonly description: "Identifier for the previous channel recurrent payment";
                                            readonly examples: readonly ["asd65465465"];
                                        };
                                    };
                                };
                            };
                            readonly creationTS: {
                                readonly type: "integer";
                                readonly description: "Timestamp when the project was created";
                                readonly examples: readonly [1640995200];
                            };
                            readonly id: {
                                readonly type: "string";
                                readonly description: "Project ID";
                                readonly pattern: "^(?:[a-zA-Z0-9]{20}|default)$";
                            };
                            readonly isDefault: {
                                readonly type: "boolean";
                                readonly description: "Indicates whether the project is the default one";
                                readonly examples: readonly [true];
                            };
                            readonly ownerId: {
                                readonly type: "string";
                                readonly description: "User ID";
                                readonly pattern: "^(?:[a-zA-Z0-9]{28}|me)$";
                            };
                            readonly users: {
                                readonly type: "array";
                                readonly description: "Array of user identifiers associated with the project";
                                readonly items: {
                                    readonly type: "string";
                                    readonly description: "User ID";
                                    readonly pattern: "^(?:[a-zA-Z0-9]{28}|me)$";
                                };
                                readonly examples: readonly ["UaAjPEY8ugiHw62MNEoWT7W6XR"];
                            };
                            readonly name: {
                                readonly type: "string";
                                readonly description: "Name of the project";
                                readonly examples: readonly ["My Project"];
                            };
                        };
                    };
                };
                readonly count: {
                    readonly type: "integer";
                    readonly format: "int32";
                    readonly description: "Count of requested chats";
                    readonly default: 20;
                    readonly minimum: -2147483648;
                    readonly maximum: 2147483647;
                };
                readonly total: {
                    readonly type: "integer";
                    readonly format: "int32";
                    readonly description: "Total number of returned chats";
                    readonly minimum: -2147483648;
                    readonly maximum: 2147483647;
                };
                readonly offset: {
                    readonly type: "integer";
                    readonly format: "int32";
                    readonly description: "Offset of requested chats";
                    readonly default: 0;
                    readonly minimum: -2147483648;
                    readonly maximum: 2147483647;
                };
            };
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "400": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "500": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
    };
};
declare const RestartChannel: {
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly ChannelID: {
                    readonly type: "string";
                    readonly description: "Channel ID";
                    readonly pattern: "^(?:[A-Z]{6}-[A-Z0-9]{5}|[A-Z0-9]{12})$";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                };
            };
            readonly required: readonly ["ChannelID"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly title: "ResponseSuccess";
            readonly type: "object";
            readonly properties: {
                readonly success: {
                    readonly type: "boolean";
                };
            };
            readonly required: readonly ["result"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "400": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "404": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "500": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "503": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
    };
};
declare const SetPartnerSettings: {
    readonly body: {
        readonly title: "Partner Settings";
        readonly type: "object";
        readonly properties: {
            readonly webhooks: {
                readonly title: "Partner Webhooks";
                readonly type: "array";
                readonly items: {
                    readonly title: "Partner Webhook";
                    readonly type: "object";
                    readonly required: readonly ["url"];
                    readonly properties: {
                        readonly url: {
                            readonly description: "Inbound and outbound partner notifications are routed to this URL.";
                            readonly type: "string";
                        };
                        readonly events: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "object";
                                readonly properties: {
                                    readonly type: {
                                        readonly type: "string";
                                        readonly enum: readonly ["days"];
                                    };
                                    readonly method: {
                                        readonly type: "string";
                                        readonly enum: readonly ["post"];
                                    };
                                };
                            };
                            readonly default: readonly [{
                                readonly type: "days";
                                readonly method: "post";
                            }];
                            readonly description: "Tracked events. <br/>\"days\" - Remaining days count lower than 7;";
                        };
                        readonly mode: {
                            readonly type: "string";
                            readonly default: "body";
                            readonly enum: readonly ["body", "path", "method"];
                            readonly description: "Request method for sending hook.\n\nDefault: `body`";
                        };
                    };
                };
            };
            readonly days_limit: {
                readonly description: "Remaining days limit, after when webhook will be send";
                readonly type: "number";
            };
            readonly noChat: {
                readonly type: "boolean";
                readonly description: "Turn off live chat for user";
            };
        };
        readonly $schema: "http://json-schema.org/draft-04/schema#";
    };
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly PartnerName: {
                    readonly type: "string";
                    readonly description: "Partner Name";
                    readonly pattern: "^[a-zA-Z0-9_-]*$";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                };
            };
            readonly required: readonly ["PartnerName"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly title: "ResponseSuccess";
            readonly type: "object";
            readonly properties: {
                readonly success: {
                    readonly type: "boolean";
                };
            };
            readonly required: readonly ["result"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "400": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "403": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "500": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
    };
};
declare const StartChannel: {
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly ChannelID: {
                    readonly type: "string";
                    readonly description: "Channel ID";
                    readonly pattern: "^(?:[A-Z]{6}-[A-Z0-9]{5}|[A-Z0-9]{12})$";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                };
            };
            readonly required: readonly ["ChannelID"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly title: "ResponseSuccess";
            readonly type: "object";
            readonly properties: {
                readonly success: {
                    readonly type: "boolean";
                };
            };
            readonly required: readonly ["result"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "400": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "404": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "500": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "503": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
    };
};
declare const StopChannel: {
    readonly body: {
        readonly title: "Stop channel options";
        readonly type: "object";
        readonly properties: {
            readonly saveDays: {
                readonly type: "boolean";
                readonly description: "Withdraw days from stopped channel";
            };
        };
        readonly $schema: "http://json-schema.org/draft-04/schema#";
    };
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly ChannelID: {
                    readonly type: "string";
                    readonly description: "Channel ID";
                    readonly pattern: "^(?:[A-Z]{6}-[A-Z0-9]{5}|[A-Z0-9]{12})$";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                };
            };
            readonly required: readonly ["ChannelID"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly title: "ResponseSuccess";
            readonly type: "object";
            readonly properties: {
                readonly success: {
                    readonly type: "boolean";
                };
            };
            readonly required: readonly ["result"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "400": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "404": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "500": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "503": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
    };
};
declare const UpdateChannel: {
    readonly body: {
        readonly title: "Channel custom fields";
        readonly type: "object";
        readonly properties: {
            readonly name: {
                readonly type: "string";
                readonly description: "Name of the channel";
                readonly examples: readonly ["My Channel"];
            };
            readonly phone: {
                readonly type: "string";
                readonly description: "Contact ID";
                readonly pattern: "^([\\d]{7,15})?$";
            };
            readonly projectId: {
                readonly type: "string";
                readonly description: "Identifier for the project associated with the channel";
                readonly examples: readonly ["project123"];
            };
            readonly recurrentPaymentId: {
                readonly type: "string";
                readonly description: "Identifier for the channel recurrent payment";
                readonly examples: readonly ["1z5dc43s4d6"];
            };
            readonly prevRecurrentPaymentId: {
                readonly type: "string";
                readonly description: "Identifier for the previous channel recurrent payment";
                readonly examples: readonly ["asd65465465"];
            };
        };
        readonly required: readonly ["name", "projectId"];
        readonly $schema: "http://json-schema.org/draft-04/schema#";
    };
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly ChannelID: {
                    readonly type: "string";
                    readonly description: "Channel ID";
                    readonly pattern: "^(?:[A-Z]{6}-[A-Z0-9]{5}|[A-Z0-9]{12})$";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                };
            };
            readonly required: readonly ["ChannelID"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly title: "ResponseSuccess";
            readonly type: "object";
            readonly properties: {
                readonly success: {
                    readonly type: "boolean";
                };
            };
            readonly required: readonly ["result"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "400": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "404": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "500": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
    };
};
declare const UpdateProject: {
    readonly body: {
        readonly title: "Project custom fields";
        readonly type: "object";
        readonly properties: {
            readonly name: {
                readonly type: "string";
                readonly description: "Name of the project";
                readonly examples: readonly ["My Project"];
            };
        };
        readonly required: readonly ["name"];
        readonly $schema: "http://json-schema.org/draft-04/schema#";
    };
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly ProjectID: {
                    readonly type: "string";
                    readonly description: "Project ID";
                    readonly pattern: "^(?:[a-zA-Z0-9]{20}|default)$";
                    readonly $schema: "http://json-schema.org/draft-04/schema#";
                };
            };
            readonly required: readonly ["ProjectID"];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly title: "ResponseSuccess";
            readonly type: "object";
            readonly properties: {
                readonly success: {
                    readonly type: "boolean";
                };
            };
            readonly required: readonly ["result"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "400": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "404": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
        readonly "500": {
            readonly title: "ResponseError";
            readonly type: "object";
            readonly properties: {
                readonly error: {
                    readonly title: "Error";
                    readonly type: "object";
                    readonly required: readonly ["code", "message"];
                    readonly properties: {
                        readonly code: {
                            readonly format: "int32";
                            readonly description: "See the https://whapi.cloud/docs/whatsapp/api/errors for more information.";
                            readonly type: "integer";
                            readonly minimum: -2147483648;
                            readonly maximum: 2147483647;
                        };
                        readonly message: {
                            readonly description: "error message";
                            readonly type: "string";
                        };
                        readonly details: {
                            readonly description: "error detail";
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly description: "location for error detail";
                            readonly type: "string";
                        };
                        readonly support: {
                            readonly description: "support contact";
                            readonly type: "string";
                        };
                    };
                };
            };
            readonly required: readonly ["error"];
            readonly $schema: "http://json-schema.org/draft-04/schema#";
        };
    };
};
export { ChangeChannelMode, CreateChannel, CreateProject, DeleteChannel, DeleteProject, ExtendChannel, GetChannel, GetChannels, GetChannelsByProjectId, GetPartnerSettings, GetProject, GetProjects, RestartChannel, SetPartnerSettings, StartChannel, StopChannel, UpdateChannel, UpdateProject };

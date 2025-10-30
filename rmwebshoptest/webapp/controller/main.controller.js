sap.ui.define([
    "./BaseController",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], (BaseController, MessageToast, MessageBox, JSONModel, Filter, FilterOperator) => {
    "use strict";

    return BaseController.extend("rm.webshop.test.controller.main", {

        onInit() {},

        _parseODataError(oError) {
            let sErrorMessage = "Der opstod en fejl. Prøv igen.";

            try {
                if (oError && oError.responseText) {
                    const oErrorObj = JSON.parse(oError.responseText);

                    // Standard SAP OData error structure
                    if (oErrorObj.error?.message?.value) {
                        sErrorMessage = oErrorObj.error.message.value;
                    }
                    // Sometimes found in innererror.errordetails
                    else if (
                        oErrorObj.error?.innererror?.errordetails?.length > 0
                    ) {
                        sErrorMessage =
                            oErrorObj.error.innererror.errordetails[0].message ||
                            sErrorMessage;
                    }
                } else if (oError && oError.message) {
                    sErrorMessage = oError.message;
                }
            } catch (e) {
                console.error("Fejl ved parsing af OData fejl:", e);
            }

            return sErrorMessage;
        },

        /**
         * Helper function: SHA512 hashing with key
         */
        async _hashCprWithKey(sCpr) {
            const sKeyString = "TESTks75ka;.kiaqq-po/gf&.hsqTEST";
            const encoder = new TextEncoder();
            const dataToHash = encoder.encode(sCpr);
            const keyBytes = encoder.encode(sKeyString);

            const cryptoKey = await crypto.subtle.importKey(
                "raw",
                keyBytes,
                { name: "HMAC", hash: "SHA-512" },
                false,
                ["sign"]
            );

            const hashBuffer = await crypto.subtle.sign("HMAC", cryptoKey, dataToHash);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase();
        },

        /**
         * 👤 Login method for patients (CPR)
         */
        async onPressLogin() {
            const sCpr = this.byId("iduserIdInput").getValue().trim();
            if (!sCpr) {
                MessageToast.show("Indtast venligst et CPR-nummer.");
                return;
            }

            let sCprHash;
            try {
                sCprHash = await this._hashCprWithKey(sCpr);
            } catch (e) {
                console.error("Hashing error:", e);
                MessageBox.error("Fejl ved kryptering af CPR-nummer.");
                return;
            }

            const oODataModel = this.getOwnerComponent().getModel();
            const that = this;
            const aFilters = [new Filter("CprHash", FilterOperator.EQ, sCprHash)];

            oODataModel.read("/UserSet", {
                filters: aFilters,
                success(oData) {
                    const aResults = oData.results;
                    if (aResults.length === 0) {
                        MessageToast.show("Ingen brugere fundet for dette CPR-nummer.");
                        return;
                    }

                    const oUsersModel = new JSONModel({ users: aResults });
                    that.getOwnerComponent().setModel(oUsersModel, "loginUsers");

                    const oLoginContext = new JSONModel({ role: "patient" });
                    that.getOwnerComponent().setModel(oLoginContext, "loginContext");

                    const oRouter = sap.ui.core.UIComponent.getRouterFor(that);

                    if (aResults.length === 1) {
                        const oSelected = aResults[0];
                        const oGlobalModel = that.getOwnerComponent().getModel("globalUser");

                        if (oGlobalModel) {
                            oGlobalModel.setProperty("/UserNo", oSelected.UserNo);
                            oGlobalModel.setProperty("/User", oSelected);
                            try {
                                window.localStorage.setItem(
                                    "rm.webshop.globalUser",
                                    JSON.stringify(oGlobalModel.getData())
                                );
                            } catch (e) {}
                        }

                        oRouter.navTo("Routevaresog");
                    } else {
                        oRouter.navTo("Routevaelgklinik");
                    }
                },

                error(oError) {
                    console.error("OData read error:", oError);
                    const sErrorMessage = that._parseODataError(oError);
                    MessageBox.error(sErrorMessage);
                }
            });
        },

        /**
         * 👨‍⚕️ Login method for doctors (CVR)
         */
        onPressDoc() {
            const sCvr = this.byId("idpasswordInput").getValue().trim();
            if (!sCvr) {
                MessageToast.show("Indtast venligst et CVR-nummer.");
                return;
            }

            const oODataModel = this.getOwnerComponent().getModel();
            const that = this;
            const aFilters = [new Filter("Cvr", FilterOperator.EQ, sCvr)];

            oODataModel.read("/UserSet", {
                filters: aFilters,
                success(oData) {
                    const aResults = oData.results;
                    if (aResults.length === 0) {
                        MessageToast.show("Ingen brugere fundet for dette CVR-nummer.");
                        return;
                    }

                    const oUsersModel = new JSONModel({ users: aResults });
                    that.getOwnerComponent().setModel(oUsersModel, "loginUsers");

                    const oLoginContext = new JSONModel({ role: "doc" });
                    that.getOwnerComponent().setModel(oLoginContext, "loginContext");

                    const oRouter = sap.ui.core.UIComponent.getRouterFor(that);

                    if (aResults.length === 1) {
                        const oSelected = aResults[0];
                        const oGlobalModel = that.getOwnerComponent().getModel("globalUser");

                        if (oGlobalModel) {
                            oGlobalModel.setProperty("/UserNo", oSelected.UserNo);
                            oGlobalModel.setProperty("/User", oSelected);
                            try {
                                window.localStorage.setItem(
                                    "rm.webshop.globalUser",
                                    JSON.stringify(oGlobalModel.getData())
                                );
                            } catch (e) {}
                        }

                        oRouter.navTo("Routeinfo");
                    } else {
                        oRouter.navTo("Routevaelgklinik");
                    }
                },

                error(oError) {
                    console.error("OData read error:", oError);
                    const sErrorMessage = that._parseODataError(oError);
                    MessageBox.error(sErrorMessage);
                }
            });
        }
    });
});

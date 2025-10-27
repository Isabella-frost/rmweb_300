sap.ui.define([
    "./BaseController",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel"
], (BaseController, MessageToast, MessageBox, JSONModel) => {
    "use strict";

    return BaseController.extend("rm.webshop.shop.controller.main", {
        onInit() {},
        
        /**
         * Helper function: SHA512 hashing with key
         */
        async _hashCprWithKey(sCpr) {
            // 1. Define Key and Data
            // Use the key exactly as specified in the prompt (no trailing dot)
            const sKeyString = "TESTks75ka;.kiaqq-po/gf&.hsqTEST"; 
            const encoder = new TextEncoder();
            
            // The data to be signed is just the CPR value.
            // The key is handled separately by the HMAC algorithm.
            const dataToHash = encoder.encode(sCpr); 
            const keyBytes = encoder.encode(sKeyString);

            // 2. Import the Key for HMAC
            const cryptoKey = await crypto.subtle.importKey(
                "raw",                             // Format of the key data
                keyBytes,                          // The key as an ArrayBuffer/Uint8Array
                { name: "HMAC", hash: "SHA-512" }, // Algorithm details
                false,                             // Not extractable
                ["sign"]                           // Usage: signing (hashing)
            );

            // 3. Compute HMAC-SHA512
            const hashBuffer = await crypto.subtle.sign(
                "HMAC",
                cryptoKey,
                dataToHash
            );

            // 4. Convert ArrayBuffer to uppercase hex string
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase();

            return hashHex;
        },

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

            // Build filter for OData
            const aFilters = [
                new sap.ui.model.Filter("CprHash", sap.ui.model.FilterOperator.EQ, sCprHash)
            ];

            oODataModel.read("/UserSet", {
                filters: aFilters,
               success(oData) {
                    const aResults = oData.results;
                    if (aResults.length === 0) {
                        MessageToast.show("Ingen brugere fundet for dette CPR-nummer.");
                        return;
                    }

                    // Create model for login users (even if only one)
                    const oUsersModel = new JSONModel({ users: aResults });
                    that.getOwnerComponent().setModel(oUsersModel, "loginUsers");

                    // Create a login context model for patient
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
                                window.localStorage.setItem("rm.webshop.globalUser", JSON.stringify(oGlobalModel.getData()));
                            } catch (e) {}
                        }

                        // Navigate directly to Routevaresog (patient start)
                        oRouter.navTo("Routevaresog");
                        return;
                    }

                    // Otherwise, go to selection view
                    oRouter.navTo("Routevaelgklinik");
                },

                error(oError) {
                    console.error("OData read error:", oError);
                    MessageBox.error("Kunne ikke hente brugerdata. Prøv igen.");
                }
            });
        },

        onPressDoc() {
            const sCvr = this.byId("idpasswordInput").getValue().trim(); // CVR input
            if (!sCvr) {
                MessageToast.show("Indtast venligst et CVR-nummer.");
                return;
            }

            const oODataModel = this.getOwnerComponent().getModel();
            const that = this;

            const aFilters = [
                new sap.ui.model.Filter("Cvr", sap.ui.model.FilterOperator.EQ, sCvr)
            ];

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

                    // ✅ If only ONE user, skip the selection view
                    if (aResults.length === 1) {
                        const oSelected = aResults[0];

                        // Set to globalUser model
                        const oGlobalModel = that.getOwnerComponent().getModel("globalUser");
                        if (oGlobalModel) {
                            oGlobalModel.setProperty("/UserNo", oSelected.UserNo);
                            oGlobalModel.setProperty("/User", oSelected);
                            try {
                                window.localStorage.setItem("rm.webshop.globalUser", JSON.stringify(oGlobalModel.getData()));
                            } catch (e) {}
                        }

                        // Navigate directly to Routeinfo (doctor view)
                        oRouter.navTo("Routeinfo");
                        return;
                    }

                    // Otherwise, go to selection view
                    oRouter.navTo("Routevaelgklinik");
                },
                error(oError) {
                    console.error("OData read error:", oError);
                    MessageBox.error("Kunne ikke hente brugerdata. Prøv igen.");
                }
            });
        }
    });
});

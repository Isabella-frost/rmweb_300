sap.ui.define([
    "./BaseController",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (BaseController, MessageToast, JSONModel, MessageBox, Filter, FilterOperator) {
    "use strict";

    return BaseController.extend("rm.webshop.test.controller.info", {

        onInit: function () {
            var sLogo = sap.ui.require.toUrl("rm/webshop/test") + "/img/Logo.jpg";
            // 1️⃣ Initialize the view model
            var oViewModel = new JSONModel({
                rmLogo: sLogo,
                selectedTabKey: "HeadInfo",
                UserInfo: {
                    doctor: "",
                    ydernr: "",
                    cvrnr: "",
                    brugernr: ""
                },
                deliveryInfoHTML: ""
            });
            this.getView().setModel(oViewModel, "view");

            this._checkBasketOnLogin();

            // 2️⃣ Load data when route matches
            this.getOwnerComponent()
                .getRouter()
                .getRoute("Routeinfo")
                .attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            var oIconTabBar = this.byId("idTopLevelTab");
            var oViewModel = this.getView().getModel("view");

            // Make sure the correct tab is selected
            oViewModel.setProperty("/selectedTabKey", "HeadInfo");
            if (oIconTabBar) {
                oIconTabBar.setSelectedKey("HeadInfo");
            }

            // Fetch user data each time the route is entered
            this._fetchUserData();
        },

        _checkBasketOnLogin: function () {
            var oODataModel = this.getOwnerComponent().getModel();
            var oViewModel = this.getView().getModel("view");

            // ✅ Get current UserNo from the global model
            var oGlobalModel = this.getOwnerComponent().getModel("globalUser");
            var sUserNo = oGlobalModel ? oGlobalModel.getProperty("/UserNo") : null;

            if (!sUserNo) {
                console.warn("No user number found for login basket check.");
                return;
            }

            var aFilters = [
                new sap.ui.model.Filter("UserNo", sap.ui.model.FilterOperator.EQ, sUserNo)
            ];

            oODataModel.read("/BasketSet", {
                filters: aFilters,
                success: function (oData) {
                    var aBasketItems = oData.results || [];
                    oViewModel.setProperty("/shoppingcart", aBasketItems);

                    // 💡 Only show info if basket has items
                    if (aBasketItems.length > 0) {
                        var iCount = aBasketItems.length;

                        sap.m.MessageBox.information(
                            "Vær opmærksom på, at du har " + iCount + " vare(r) i din kurv fra tidligere.",
                            {
                                title: "Kurv fundet",
                                actions: [sap.m.MessageBox.Action.OK]
                            }
                        );
                    } else {
                        console.log("Kurven er tom ved login ingen besked vist.");
                    }
                },
                error: function (oError) {
                    console.error("Fejl ved læsning af kurv:", oError);
                    // Optional warning if basket cannot be read
                    sap.m.MessageToast.show("Kunne ikke hente kurv ved login.");
                }
            });
        },

        /**
         * 🔍 Fetch user data for the currently selected UserNo (from global model)
         */
        _fetchUserData: function () {
            var oODataModel = this.getOwnerComponent().getModel(); // main OData model
            var oViewModel = this.getView().getModel("view");

            // ✅ Get current UserNo from the global model
            var oGlobalModel = this.getOwnerComponent().getModel("globalUser");
            var sUserNo = oGlobalModel ? oGlobalModel.getProperty("/UserNo") : null;

            if (!sUserNo) {
                MessageToast.show("Bruger-ID ikke fundet. Log venligst ind igen.");
                return;
            }

            var sPath = `/UserSet('${sUserNo}')`;

            oODataModel.read(sPath, {
                urlParameters: {
                    "$format": "json"
                },
                success: function (oData) {
                    oViewModel.setProperty("/UserInfo", {
                        doctor: oData.AdrName || "N/A",
                        ydernr: oData.Ydernr || "N/A",
                        cvrnr: oData.Cvr || "N/A",
                        brugernr: oData.UserNo || "N/A"
                    });
                    oViewModel.setProperty("/deliveryInfoHTML", oData.UserInfo || "");
                },
                error: function (oError) {
                    console.error("OData Read failed:", oError);
                    MessageToast.show("Kunne ikke hente brugerdata.");
                    oViewModel.setProperty("/UserInfo", {
                        doctor: "Fejl ved indlæsning",
                        ydernr: "",
                        cvrnr: "",
                        brugernr: ""
                    });
                }
            });
        },

        /**
         * 🔁 Handles tab navigation
         */
        handleIconTabBarSelect: function (oEvent) {
            var sKey = oEvent.getParameter("selectedKey");
            var oViewModel = this.getView().getModel("view");
            oViewModel.setProperty("/selectedTabKey", sKey);

            var oRouter = this.getOwnerComponent().getRouter();

            switch (sKey) {
                case "HeadXSoegning":
                    oRouter.navTo("Routexdocvaresog");
                    break;
                case "HeadInfo":
                    oRouter.navTo("Routeinfo");
                    break;
                case "HeadXOversigt":
                    oRouter.navTo("Routexdocbestilling");
                    break;
                case "HeadXProfil":
                    oRouter.navTo("Routexdocprofil");
                    break;
                case "HeadXSupport":
                    oRouter.navTo("Routexdocsupport");
                    break;
                default:
                    break;
            }
        },

        onBack: function () {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            var oViewModel = this.getView().getModel("view");
            var oGlobalModel = this.getOwnerComponent().getModel("globalUser");
            var sUserNo = oGlobalModel ? oGlobalModel.getProperty("/UserNo") : null;

            // 1. Load the current basket before logging off
            var oODataModel = this.getOwnerComponent().getModel();

            var aFilters = [
                new sap.ui.model.Filter("UserNo", sap.ui.model.FilterOperator.EQ, sUserNo)
            ];

            oODataModel.read("/BasketSet", {
                filters: aFilters,
                success: function (oData) {
                    var aBasketItems = oData.results || [];

                    // 2. Check if there are any items
                    if (aBasketItems.length > 0) {
                        // 3. Ask user before logging off
                        sap.m.MessageBox.confirm(
                            "Du har varer i din kurv. Vil du fortsat logge af? (Din kurv gemmes til næste besøg)",
                            {
                                title: "Bekræft log af",
                                actions: [sap.m.MessageBox.Action.OK, sap.m.MessageBox.Action.CANCEL],
                                onClose: function (sAction) {
                                    if (sAction === sap.m.MessageBox.Action.OK) {
                                        // Proceed to main page
                                        oRouter.navTo("Routemain");
                                    }
                                }
                            }
                        );
                    } else {
                        // No items — just log off
                        oRouter.navTo("Routemain");
                    }
                },
                error: function (oError) {
                    // If basket cannot be loaded, show a simple fallback message
                    sap.m.MessageBox.warning(
                        "Kunne ikke hente din kurv. Vil du fortsætte med at logge af?",
                        {
                            actions: [sap.m.MessageBox.Action.OK, sap.m.MessageBox.Action.CANCEL],
                            onClose: function (sAction) {
                                if (sAction === sap.m.MessageBox.Action.OK) {
                                    oRouter.navTo("Routemain");
                                }
                            }
                        }
                    );
                    console.error("BasketSet read error during logoff:", oError);
                }
            });
        },

        onOpenBasket: function () {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("Routexdocvaresog");
        }
    });
});

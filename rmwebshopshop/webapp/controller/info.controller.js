sap.ui.define([
    "./BaseController",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (BaseController, MessageToast, JSONModel, MessageBox, Filter, FilterOperator) {
    "use strict";

    return BaseController.extend("rm.webshop.shop.controller.info", {

        onInit: function () {
            var sLogo = sap.ui.require.toUrl("rm/webshop/shop") + "/img/Logo.jpg";
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
            oRouter.navTo("Routemain");
        },

        onOpenBasket: function () {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("Routexdocvaresog");
        }
    });
});

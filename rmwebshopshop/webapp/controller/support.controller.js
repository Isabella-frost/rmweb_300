sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast" 
],
function (BaseController, JSONModel, MessageToast) { 
    "use strict";
    
    return BaseController.extend("rm.webshop.shop.controller.support", {
        onInit: function () {
            var sLogo = sap.ui.require.toUrl("rm/webshop/shop") + "/img/Logo.jpg";

            var oViewModel = new JSONModel({
                rmLogo: sLogo,
                selectedTabKey: "HeadSupport", 
                UserInfo: {
                    navn: "",
                    adresse: "",
                    zip: "",
                    by: "",
                    tlfnr: "",
                    brugernr: "",
                    afdeling: ""
                }
            });
            this.getView().setModel(oViewModel, "view");
            
            // Attach to the routeMatched event
            this.getOwnerComponent().getRouter().getRoute("Routesupport").attachPatternMatched(this._onRouteMatched, this);
            
            // Use the Component's model for OData read, but only after it's initialized
            this._fetchUserData();
        },
        
        _getCurrentUserNo: function () {
            const oGlobalModel = this.getOwnerComponent().getModel("globalUser");
            return oGlobalModel ? oGlobalModel.getProperty("/UserNo") : null;
        },

        _fetchUserData: function() {
            // Get the OData model from the Component
            var oODataModel = this.getOwnerComponent().getModel(); 
            var oViewModel = this.getView().getModel("view");
            const sUserNo       = this._getCurrentUserNo();
            const sPath = `/UserSet('${sUserNo}')`;

            if (!oODataModel) {
                MessageToast.show("Error: OData model not available.");
                return;
            }
        
            oODataModel.read(sPath, {
                urlParameters: {
                    "$format": "json"
                },
                success: function(oData) {
                    oViewModel.setProperty("/UserInfo", {
                        navn: oData.AdrName || "N/A",
                        adresse: oData.AdrStreet || "N/A",
                        zip: oData.AdrZip || "N/A",
                        by: oData.AdrCity || "N/A",
                        tlfnr: oData.Phone || "Ukendt, kan opdateres i 'Profil'",
                        brugernr: oData.UserNo || "N/A",
                        afdeling: oData.Afdeling
                    });
                }.bind(this),
                error: function(oError) {
                    MessageToast.show("Failed to load user data.");
                    console.error("OData Read failed:", oError);
                    oViewModel.setProperty("/UserInfo", {
                        navn: "Fejl: Kunne ikke hente data",
                        adresse: "", zip: "", by: "", tlfnr: "", brugernr: "", afdeling: ""
                    });
                }.bind(this)
            });
        },

        _onRouteMatched: function (oEvent) {
            var oIconTabBar = this.byId("idTopLevelTab");
            var oViewModel = this.getView().getModel("view");
            
            if (oIconTabBar) {
                oIconTabBar.setSelectedKey("HeadSupport");

                oViewModel.setProperty("/selectedTabKey", "HeadSupport");
            }
        },

        handleIconTabBarSelect: function(oEvent) {
            var sKey = oEvent.getParameter("selectedKey");
            var oViewModel = this.getView().getModel("view");

            oViewModel.setProperty("/selectedTabKey", sKey);

            if (sKey === "HeadSoegning") {
                this.getOwnerComponent().getRouter().navTo("Routevaresog");
            }
            if (sKey === "HeadOversigt") {
                this.getOwnerComponent().getRouter().navTo("Routebestilling");
            }
            if (sKey === "HeadProfil") {
                this.getOwnerComponent().getRouter().navTo("Routeprofil");
            }
            if (sKey === "HeadSupport") {
                this.getOwnerComponent().getRouter().navTo("Routesupport");
            }
        },

        onBack() {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("Routemain");
        }
    });
});
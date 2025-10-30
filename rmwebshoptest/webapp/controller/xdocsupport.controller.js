sap.ui.define([
    "./BaseController",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox", 
    "sap/ui/model/Filter", 
    "sap/ui/model/FilterOperator"
],
function (BaseController, MessageToast, JSONModel, MessageBox, Filter, FilterOperator) {
    "use strict";

    return BaseController.extend("rm.webshop.test.controller.xdocsupport", {

        onInit: function () {
            var sLogo = sap.ui.require.toUrl("rm/webshop/test") + "/img/Logo.jpg";
            // 1. Initialize the view model with all required properties
            var oViewModel = new JSONModel({
                rmLogo: sLogo,
                selectedTabKey: "HeadXSupport", 
                UserInfo: { 
                    doctor: "",
                    ydernr: "",
                    cvrnr: "",
                    brugernr: ""
                }
            });
            this.getView().setModel(oViewModel, "view");
            
            // 2. Load User Data immediately
            this._fetchUserData(); 

            // 3. Attach to the routeMatched event
            this.getOwnerComponent().getRouter().getRoute("Routexdocsupport").attachPatternMatched(this._onRouteMatched, this);
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
                        doctor: oData.AdrName || "N/A",  
                        ydernr: oData.Ydernr || "N/A",  
                        cvrnr: oData.Cvr || "N/A",    
                        brugernr: oData.UserNo || "N/A"
                    });
                }.bind(this),
                error: function(oError) {
                    MessageToast.show("Failed to load user data.");
                    console.error("OData Read failed:", oError);
                    oViewModel.setProperty("/UserInfo", {
                        doctor: "Fejl: Kunne ikke hente data",
                        ydernr: "", cvrnr: "", brugernr: ""
                    });
                }.bind(this)
            });
        },

        _onRouteMatched: function (oEvent) {
            var oIconTabBar = this.byId("idTopLevelTab");
            var oViewModel = this.getView().getModel("view");
            if (oIconTabBar) {
                // Set the correct key on the IconTabBar
                oIconTabBar.setSelectedKey("HeadXSupport");
                
                oViewModel.setProperty("/selectedTabKey", "HeadXSupport");
            }
        },
        
        handleIconTabBarSelect: function(oEvent) {
            var sKey = oEvent.getParameter("selectedKey");
            var oViewModel = this.getView().getModel("view");

            oViewModel.setProperty("/selectedTabKey", sKey);
             if (sKey === "HeadXSoegning") {
                 this.getOwnerComponent().getRouter().navTo("Routexdocvaresog");
             }
             if (sKey === "HeadInfo") {
                 this.getOwnerComponent().getRouter().navTo("Routeinfo");
             }
             if (sKey === "HeadXOversigt") {
                 this.getOwnerComponent().getRouter().navTo("Routexdocbestilling");
             }
             if (sKey === "HeadXProfil") {
                 this.getOwnerComponent().getRouter().navTo("Routexdocprofil");
             }
             if (sKey === "HeadXSupport") {
                 this.getOwnerComponent().getRouter().navTo("Routexdocsupport");
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
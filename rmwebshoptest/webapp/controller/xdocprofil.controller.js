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

    return BaseController.extend("rm.webshop.test.controller.xdocprofil", {
        
        // Private property to cache the initially fetched user data
        _oInitialUserData: {}, 

        onInit: function () {
            var sLogo = sap.ui.require.toUrl("rm/webshop/test") + "/img/Logo.jpg";
            // 1. Initialize View Model
            var oViewModel = new JSONModel({
                rmLogo: sLogo,
                selectedTabKey: "HeadXProfil",
                UserInfo: {
                    doctor: "", ydernr: "", cvrnr: "", brugernr: "", 
                    street: "", zip: "", city: "", phone: "", mail: "",
                    favorite: "" // Added for binding to the ComboBox
                }
            });
            this.getView().setModel(oViewModel, "view");
            
            // Initialize a separate JSON Model for Webshop/Favorites data
            this.getView().setModel(new JSONModel({ lists: [] }), "webshop");

            // 2. Load Data immediately
            this._fetchUserData(); 
            this._fetchFavoriteLists(); 

            // 3. Attach to the routeMatched event
            this.getOwnerComponent().getRouter().getRoute("Routexdocprofil").attachPatternMatched(this._onRouteMatched, this);
        },

        _getCurrentUserNo: function () {
            const oGlobalModel = this.getOwnerComponent().getModel("globalUser");
            return oGlobalModel ? oGlobalModel.getProperty("/UserNo") : null;
        },

        _fetchUserData: function() {
            const sUserNo       = this._getCurrentUserNo();
            var oODataModel = this.getOwnerComponent().getModel(); 
            var oViewModel = this.getView().getModel("view");
            const sPath = `/UserSet('${sUserNo}')`;
            
            if (!oODataModel) {
                MessageToast.show("Error: OData model not available.");
                return;
            }

            oODataModel.read(sPath, {
                urlParameters: { "$format": "json" },
                success: function(oData) {
                    // Cache the initial data for use in update operations
                    this._oInitialUserData = oData; 

                    oViewModel.setProperty("/UserInfo", {
                        doctor: oData.AdrName || "N/A", ydernr: oData.Ydernr || "N/A", cvrnr: oData.Cvr || "N/A", 
                        brugernr: oData.UserNo || "N/A", street: oData.AdrStreet || "N/A", zip: oData.AdrZip || "N/A",
                        city: oData.AdrCity || "N/A", phone: oData.Phone || "Udfyld her", mail: oData.EMail|| "Udfyld her",
                        favorite: oData.FavoriteList // Set the selected favorite list
                    });
                }.bind(this),
                error: function(oError) {
                    MessageToast.show("Failed to load user data.");
                    console.error("OData Read failed:", oError);
                }.bind(this)
            });
        },
        
        _fetchFavoriteLists: function () {
            var oODataModel = this.getOwnerComponent().getModel(); 
            var oWebshopModel = this.getView().getModel("webshop");
            const sUserNo = this._getCurrentUserNo();

            // Define the "Alle varer" default list
            const oAllItemsList = {
                UserNo: sUserNo || "",
                FavoriteList: "Alle varer",
                GuidMat: "0"
            };

            if (!oODataModel) {
                // If no OData model, just show "Alle varer"
                oWebshopModel.setProperty("/lists", [oAllItemsList]);
                return;
            }

            const aFilters = [
                new Filter("UserNo", FilterOperator.EQ, sUserNo)
            ];

            oODataModel.read("/FavoriteSet", {
                filters: aFilters,
                urlParameters: { "$format": "json" },
                success: function (oData) {
                    let aFavoriteLists = oData.results || [];

                    // ✅ Always insert "Alle varer" first
                    aFavoriteLists.unshift(oAllItemsList);

                    oWebshopModel.setProperty("/lists", aFavoriteLists);

                    console.log("Favorite lists loaded:", aFavoriteLists);
                }.bind(this),
                error: function (oError) {
                    MessageToast.show("Kunne ikke hente favoritlister. Viser kun 'Alle varer'.");
                    oWebshopModel.setProperty("/lists", [oAllItemsList]);
                    console.error("FavoriteSet read error:", oError);
                }
            });
        },

        _onRouteMatched: function (oEvent) {
            // ... (existing implementation) ...
            var oIconTabBar = this.byId("idTopLevelTab");
            if (oIconTabBar) {
                oIconTabBar.setSelectedKey("HeadXProfil");
            }
        },
        
        handleIconTabBarSelect: function(oEvent) {
            // ... (existing implementation) ...
            var sKey = oEvent.getParameter("selectedKey");
            var oRouter = this.getOwnerComponent().getRouter();

            this.getView().getModel("view").setProperty("/selectedTabKey", sKey);

            if (sKey === "HeadXProfil") { 
                return; 
            }
            if (sKey === "HeadXSoegning") {
                oRouter.navTo("Routexdocvaresog");
            } else if (sKey === "HeadInfo") { 
                oRouter.navTo("Routeinfo");
            } else if (sKey === "HeadXOversigt") {
                oRouter.navTo("Routexdocbestilling");
            } else if (sKey === "HeadXSupport") {
                oRouter.navTo("Routexdocsupport");
            }
        },
        
        // --- NEW SAVE FUNCTIONS ---

        /**
         * Handler for 'Gem kontaktoplysninger' button.
         * Updates Phone and EMail.
         */
        onUpdateContactInfo: function() {
            var oViewModel = this.getView().getModel("view");
            var oUserInfo = oViewModel.getProperty("/UserInfo");
            
            // The properties to update are Phone and EMail
            var oUpdates = {
                "Phone": oUserInfo.phone,
                "EMail": oUserInfo.mail
            };
            
            this._updateUser(oUpdates, "Kontaktoplysninger");
        },

        /**
         * Handler for 'Gem' button (for FavoriteList).
         * Updates FavoriteList.
         */
        onUpdateFavoriteList: function () {
            var oViewModel = this.getView().getModel("view");
            var sFavoriteList = oViewModel.getProperty("/UserInfo/favorite");

            // 💡 If "Alle varer" is selected, treat it as "no specific favorite list"
            if (sFavoriteList === "Alle varer" || !sFavoriteList) {
                sFavoriteList = ""; // or null, depending on your backend expectations
            }

            var oUpdates = {
                "FavoriteList": sFavoriteList
            };

            this._updateUser(oUpdates, "Favoritliste");
        },

        /**
         * Helper function to construct the full payload and send the OData POST request.
         * @param {object} oUpdates - The key-value pairs of properties to update.
         * @param {string} sUpdateType - A string describing what was updated (for MessageToast).
         */
        _updateUser: function(oUpdates, sUpdateType) {
            var oODataModel = this.getOwnerComponent().getModel();
            var oInitialData = this._oInitialUserData;
            const sUserNo       = this._getCurrentUserNo();

            if (!oODataModel) {
                MessageToast.show("Fejl: OData model ikke tilgængelig.");
                return;
            }

            // Construct the complete payload, merging initial data with new updates
            var oPayload = {
                "UserNo": sUserNo,
                
                // Keep existing values or use initial defaults for all other fields
                "DelName": oInitialData.DelName,
                "Phone": oInitialData.Phone, 
                "EMail": oInitialData.EMail,
                "FavoriteList": oInitialData.FavoriteList,

                ...oUpdates 
            };
            
            // Send the POST request to the entity set
            oODataModel.create("/UserSet", oPayload, {
                success: function(oData, oResponse) {
                    MessageToast.show(sUpdateType + " opdateret succesfuldt!");
                    
                    // Update the header data if the Phone or EMail was changed
                    if (oUpdates.Phone) {
                        this.getView().getModel("view").setProperty("/UserInfo/phone", oUpdates.Phone);
                    }
                }.bind(this),
                error: function(oError) {
                    MessageToast.show("Fejl ved opdatering af " + sUpdateType.toLowerCase() + ".");
                    console.error("OData Create (Update) failed:", oError);
                }
            });
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
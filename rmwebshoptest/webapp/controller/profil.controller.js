sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageToast"
],
function (BaseController, JSONModel, MessageToast) {
	"use strict";
	
	return BaseController.extend("rm.webshop.test.controller.profil", {
		
		// Stores the initially fetched user data to use for fields not being updated
		_oInitialUserData: {}, 

		onInit: function () {
			var sLogo = sap.ui.require.toUrl("rm/webshop/test") + "/img/Logo.jpg";
			// Initialize the view model with default values
			var oViewModel = new JSONModel({
				rmLogo: sLogo,
				selectedAddressOption: 0, 
				UserInfo: {
					navn: "",
					brugernr: "",
					street: "", 
					zip: "",
					city: "",
					tlfnr: "", // Used for header display
					phone: "", // Used for input field and update
					mail: "",
					DelStreet: "",
					DelZip: "",
					DelCity: "",
					afdeling: ""
				}
			});
			this.getView().setModel(oViewModel, "view");

			this.getOwnerComponent().getRouter().getRoute("Routeprofil").attachPatternMatched(this._onRouteMatched, this);
			
			this._fetchUserData();
		},

        _getCurrentUserNo: function () {
            const oGlobalModel = this.getOwnerComponent().getModel("globalUser");
            return oGlobalModel ? oGlobalModel.getProperty("/UserNo") : null;
        },
		
		_fetchUserData: function() {
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
					// Store initial data
					this._oInitialUserData = oData;
					
					// Mapping data to the view model
					oViewModel.setProperty("/UserInfo", {
						navn: oData.AdrName || "N/A", 
						brugernr: oData.UserNo || "N/A",
						street: oData.AdrStreet || "N/A",
						zip: oData.AdrZip || "N/A",
						city: oData.AdrCity || "N/A",
						tlfnr: oData.Phone || "Ukendt, kan opdateres i 'Profil'", 
						phone: oData.Phone || "", // Use empty string for better user experience in input
						mail: oData.EMail || "",
						DelStreet: oData.DelStreet || "",
						DelZip: oData.DelZip || "",
						DelCity: oData.DelCity || "",
						afdeling: oData.Afdeling
					});
				}.bind(this),
				error: function(oError) {
					MessageToast.show("Failed to load user data.");
					console.error("OData Read failed:", oError);
					oViewModel.setProperty("/UserInfo", {
						navn: "Fejl: Kunne ikke hente data",
						street: "", zip: "", city: "", tlfnr: "", brugernr: "", afdeling: ""
					});
				}.bind(this)
			});
		},

		_onRouteMatched: function (oEvent) {
			var oIconTabBar = this.byId("idTopLevelTab");
			if (oIconTabBar) {
				oIconTabBar.setSelectedKey("HeadProfil");
			}
		},

		handleIconTabBarSelect: function(oEvent) {
			var sKey = oEvent.getParameter("selectedKey");
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

		onUpdateUser: function() {
			var oODataModel = this.getOwnerComponent().getModel();
			var oViewModel = this.getView().getModel("view");
			var oUserInfo = oViewModel.getProperty("/UserInfo");
			var oInitialData = this._oInitialUserData;
			const sUserNo       = this._getCurrentUserNo();

			if (!oODataModel) {
				MessageToast.show("Fejl: OData model ikke tilgængelig.");
				return;
			}
			
			// Construct the payload for the POST request
			// Fields are taken from the current view model (user input)
			// or from the initially fetched data (oInitialData) for defaults/unchanged fields.
			var oPayload = {
				"UserNo": sUserNo,
				// Fields from initial fetch (defaults/unchanged)
				"DelName": oInitialData.DelName || "DEL Lægerne Gasvej 5", // Using initial value or a fallback
				"DelName2": oInitialData.DelName2 || "Del name2",
				"DelAtt": oInitialData.DelAtt || "DEL ATT",
				"FavoriteList": oInitialData.FavoriteList || "Favorite99",

				// Fields from user input in the view model
				"DelStreet": oUserInfo.DelStreet,
				"DelZip": oUserInfo.DelZip,
				"DelCity": oUserInfo.DelCity,
				"Phone": oUserInfo.phone,
				"EMail": oUserInfo.mail
			};
			
			// Send the POST request to the entity set
			oODataModel.create("/UserSet", oPayload, {
				success: function(oData, oResponse) {
					MessageToast.show("Brugerinformation opdateret succesfuldt!");
					// Update the header phone number after successful save
					oViewModel.setProperty("/UserInfo/tlfnr", oUserInfo.phone);
					this._fetchUserData(); 
				}.bind(this),
				error: function(oError) {
					MessageToast.show("Fejl ved opdatering af brugerinformation.");
					console.error("OData Create (Update) failed:", oError);
				}
			});
		},

        onBack() {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("Routemain");
        },

        onOpenBasket: function () {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("Routevaresog");
        }
	});
});
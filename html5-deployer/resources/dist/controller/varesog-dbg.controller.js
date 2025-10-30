sap.ui.define([
    "./BaseController",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "./Formatter"
],
function (BaseController, MessageToast, JSONModel, Fragment, MessageBox, Filter, FilterOperator, Formatter) {
    "use strict";

    return BaseController.extend("rm.webshop.test.controller.varesog", {

        // all dialog properties
        _oOrderDialog: null,
        _oFinalConfirmationDialog: null,
        _oOrderSentDialog: null,
        formatter: Formatter,

        onInit: function () {
            var sLogo = sap.ui.require.toUrl("rm/webshop/test") + "/img/Logo.jpg";
            // Setup the main view model
            var oViewModel = new JSONModel({
                rmLogo: sLogo,
                basket: [],
                selectedAddressOption: 0,
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

            var oWebshopModel = new JSONModel({
                orders: [] 
            });
            this.getOwnerComponent().setModel(oWebshopModel, "webshop");
            // -----------------------------------------------------
            this._fetchUserData();

            // attach route
            this.getOwnerComponent().getRouter()
                .getRoute("Routevaresog")
                .attachPatternMatched(this._onRouteMatched, this);
        },
        
        _getCurrentUserNo: function () {
            const oGlobalModel = this.getOwnerComponent().getModel("globalUser");
            return oGlobalModel ? oGlobalModel.getProperty("/UserNo") : null;
        },

       _onRouteMatched: function (oEvent) {
            const sUserNo       = this._getCurrentUserNo();
            var oIconTabBar = this.byId("idTopLevelTab");
            if (oIconTabBar) {
                oIconTabBar.setSelectedKey("HeadSoegning");
            }
            this._loadCatalogSet(sUserNo); 
            this._loadBasket(sUserNo);
            this._fetchUserData();    
        },

         _loadBasket: function (sUserNo) {
            var oODataModel = this.getOwnerComponent().getModel();
            var oViewModel = this.getView().getModel("view");
            var aFilters = [
                // Use imported Filter/FilterOperator if defined, otherwise use global sap.ui.model...
                new (Filter || sap.ui.model.Filter)("UserNo", (FilterOperator || sap.ui.model.FilterOperator).EQ, sUserNo)
            ];

            oODataModel.read("/BasketSet", {
                filters: aFilters,
                success: function (oData) {
                    // Store the OData results in the 'view' JSON model under a new path, e.g., '/shoppingcart'
                    oViewModel.setProperty("/shoppingcart", oData.results);
                    console.log("BasketSet loaded:", oData.results);
                },
                error: function (oError) {
                    sap.m.MessageBox.error("Fejl ved load af varekurvdata. Prøv venligst igen.");
                    console.error("BasketSet read error", oError);
                }
            });
        },

        _loadCatalogSet: function (sUserNo) {
            var oODataModel = this.getOwnerComponent().getModel(); // mainService model
            var oViewModel = this.getView().getModel("view"); // JSONModel bound to the view
            // var that = this; // 'that' is not necessary if you use .bind(this)

            const Filter = sap.ui.model.Filter;
            const FilterOperator = sap.ui.model.FilterOperator;

            // Build filter
            var aFilters = [
                new Filter("UserNo", FilterOperator.EQ, sUserNo)
            ];

            sap.ui.core.BusyIndicator.show(0);

            // Call OData read
            oODataModel.read("/CatalogSet", {
                filters: aFilters,
                urlParameters: {
                    "$expand": "CatalogAttributeSet", 
                    "$format": "json" // It's good practice to explicitly include format
                },
                success: function (oData, response) {
                    sap.ui.core.BusyIndicator.hide();
                    // Store result in view model
                    oViewModel.setProperty("/catalog", oData.results);

                    // log to console
                    console.log("CatalogSet with Attributes loaded:", oData.results);
                }.bind(this), // .bind(this) to maintain controller context
                error: function (oError) {
                    sap.ui.core.BusyIndicator.hide();
                    sap.m.MessageBox.error("Fejl ved load af katalogdata. Prøv igen.");
                    console.error("CatalogSet read error", oError);
                }.bind(this) // Use .bind(this)
            });
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

        onSearchMaterials: function (oEvent) {
            // Get the value of the search field
            var sQuery = oEvent.getParameter("newValue");

            // Define filters
            var aFilters = [];

            if (sQuery) {
                // Create a filter 
                var oFilterMatnr = new sap.ui.model.Filter("Matnr", sap.ui.model.FilterOperator.Contains, sQuery);
                var oFilterMaktx = new sap.ui.model.Filter("Maktx", sap.ui.model.FilterOperator.Contains, sQuery);
                var oFilterMaktxLong = new sap.ui.model.Filter("MaktxLong", sap.ui.model.FilterOperator.Contains, sQuery);
                var oFilterLevmat = new sap.ui.model.Filter("Levmat", sap.ui.model.FilterOperator.Contains, sQuery);
                var oFilterKeyword = new sap.ui.model.Filter("KeywordSearch", sap.ui.model.FilterOperator.Contains, sQuery);

                // Combine the filters with an OR operator
                var oCombinedFilter = new sap.ui.model.Filter({
                    filters: [oFilterMatnr, oFilterMaktx, oFilterMaktxLong, oFilterLevmat, oFilterKeyword],
                    and: false
                });

                aFilters.push(oCombinedFilter);
            }

            // Get the binding of the List control
            var oList = this.getView().byId("catalogList");
            var oBinding = oList.getBinding("items");

            // Apply the filter(s) to the binding
            oBinding.filter(aFilters);
        },

    onAddToCart: function (oEvent) {

        // 1. Get the control that fired the event (the Button)
        var oButton = oEvent.getSource();
        // 2. Get the binding context of the Button's parent item (CustomListItem/Panel)
        var oContext = oButton.getBindingContext("view");
        
        // 3. Get the data object from the context
        var oMaterialData = oContext.getObject();

        // 4. Extract required fields for the payload
        const sUserNo       = this._getCurrentUserNo();
        var sGuidMat = oMaterialData.GuidMat; 
        var sMatnr = oMaterialData.Matnr; 
        
            var oPayload = {
                UserNo: sUserNo,
                GuidMat: oMaterialData.GuidMat,
                OrderQuantity: oMaterialData.Multiplum
            };
            
            // 5. Get the OData model (mainService model)
            var oODataModel = this.getOwnerComponent().getModel();
            
            // 6. Define the path for the CREATE request
            var sPath = "/BasketSet";
            
            // 7. Perform the OData POST request (CREATE)
            oODataModel.create(sPath, oPayload, {
                success: function (oData) { 
                    // Call the _loadBasket function to refresh the cart display
                    this._loadBasket(sUserNo);

                    // Show success message. Note: sMatnr is from the catalog, oPayload.Quantity is '1'
                    MessageToast.show(oData.Maktx + " tilføjet til kurv");
                }.bind(this),
                error: function (oError) {
                    var sErrorMessage = "Fejl ved tilføjelse til kurv. Prøv igen"; // fallback message

                    try {
                        if (oError && oError.responseText) {
                            var oErrorObj = JSON.parse(oError.responseText);

                            // Standard SAP OData v2 structure
                            if (oErrorObj.error && oErrorObj.error.message && oErrorObj.error.message.value) {
                                sErrorMessage = oErrorObj.error.message.value;
                            }

                            // Sometimes, multiple detailed messages exist under errordetails
                            else if (
                                oErrorObj.error &&
                                oErrorObj.error.innererror &&
                                oErrorObj.error.innererror.errordetails &&
                                oErrorObj.error.innererror.errordetails.length > 0
                            ) {
                                // Use the first detailed error message
                                sErrorMessage = oErrorObj.error.innererror.errordetails[0].message || sErrorMessage;
                            }
                        } else if (oError && oError.message) {
                            // fallback if only top-level message exists
                            sErrorMessage = oError.message;
                        }
                    } catch (e) {
                        console.error("Fejl ved parsing af OData fejl:", e);
                    }

                    // Display user-friendly message
                    MessageBox.error(sErrorMessage);
                    console.error("Varekurv fejl:", oError);
                }

            });
        },

        onDecreaseQuantity: function (oEvent) {

        // 1. Get the control that fired the event (the Button)
        var oButton = oEvent.getSource();
        // 2. Get the binding context of the Button's parent item (CustomListItem/Panel)
        var oContext = oButton.getBindingContext("view");
        
        // 3. Get the data object from the context
        var oMaterialData = oContext.getObject();

        // 4. Extract required fields for the payload
        const sUserNo       = this._getCurrentUserNo(); 
        var sGuidMat = oMaterialData.GuidMat; 
        var sMatnr = oMaterialData.Matnr; 
        var sMult = oMaterialData.Multiplum 
        var sPayloadQuantity = "-" + sMult.toString(); 
        
            var oPayload = {
                UserNo: sUserNo,
                GuidMat: oMaterialData.GuidMat,
                OrderQuantity: sPayloadQuantity
            };
            
            // 5. Get the OData model (mainService model)
            var oODataModel = this.getOwnerComponent().getModel();
            
            // 6. Define the path for the CREATE request
            var sPath = "/BasketSet";
            
            // 7. Perform the OData POST request (CREATE)
            oODataModel.create(sPath, oPayload, {
                success: function (oData) { 
                    // Call the _loadBasket function to refresh the cart display
                    this._loadBasket(sUserNo);

                    MessageToast.show(oMaterialData.Maktx + " fjernet fra kurv");
                }.bind(this),
                error: function (oError) {
                    MessageBox.error("Fejl ved opdatering af varekurv. Prøv igen.");
                    console.error("Varekurv fejl:", oError);
                }
            });
        },

        onRemoveFromCart: function (oEvent) {

            // 1. Get the control that fired the event (the Button)
            var oButton = oEvent.getSource();
            // 2. Get the binding context of the Button's parent item (CustomListItem/Panel)
            var oContext = oButton.getBindingContext("view");
            
            // 3. Get the data object from the context
            var oMaterialData = oContext.getObject();

            // 4. Extract required fields for the payload
            const sUserNo       = this._getCurrentUserNo();
            var sMatnr = oMaterialData.Matnr; 
            
            // Get the current quantity from the basket item
            var iCurrentQuantity = parseInt(oMaterialData.OrderQuantity, 10);

            var sPayloadQuantity = "-" + iCurrentQuantity.toString(); // e.g., if quantity is '5', payload is '-5'

            // Check if the quantity is valid before sending the request
            if (iCurrentQuantity <= 0 || isNaN(iCurrentQuantity)) {
                MessageToast.show("Kurven er tom");
                return;
            }
            
            var oPayload = {
                UserNo: sUserNo,
                GuidMat: oMaterialData.GuidMat,
                // Pass the total negative quantity to remove all items
                OrderQuantity: sPayloadQuantity 
            };
            
            // 5. Get the OData model (mainService model)
            var oODataModel = this.getOwnerComponent().getModel();
            
            // 6. Define the path for the CREATE request
            var sPath = "/BasketSet";
            
            // 7. Perform the OData POST request (CREATE)
            oODataModel.create(sPath, oPayload, {
                success: function (oData) { 
                    // Call the _loadBasket function to refresh the cart display
                    this._loadBasket(sUserNo);

                    // Show success message, using the original positive quantity for the message
                    MessageToast.show(oMaterialData.Maktx + " fjernet fra kurv");
                }.bind(this),
                error: function (oError) {
                    MessageBox.error("Fejl ved fjernelse af materiale fra kurv. Prøv venligst igen.");
                    console.error("BasketSet create error:", oError);
                }
            });
        },

onOrder: function () {
            // 1. Check for total items using the current model path/property
            var aCartItems = this.getView().getModel("view").getProperty("/shoppingcart") || [];
            
            var iTotalItems = aCartItems.reduce(function (total, item) {
                return total + parseInt(item.OrderQuantity, 10); 
            }, 0);

            if (iTotalItems === 0) {
                 MessageToast.show("Kurven er tom."); 
                 return;
            }

            // 2. Load fragment asynchronously (recommended practice)
            if (!this._oOrderDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "rm.webshop.test.view.fragment.OrderDialog", 
                    controller: this
                }).then(function(oDialog) {
                    this._oOrderDialog = oDialog;
                    this.getView().addDependent(oDialog);
                    this._setupOrderDialog(iTotalItems);
                }.bind(this));
            } else {
                 this._setupOrderDialog(iTotalItems);
            }
        },

        _setupOrderDialog: function(iTotalItems) {
            var oViewModel = this.getView().getModel("view");
            var oUserContact = oViewModel.getProperty("/UserContact") || {
                email: "", phone: "", address: {}
            };

            var oDialogModel = new JSONModel({
                alternativeAddress: {
                    streetName: "",
                    streetNr: "",
                    postalCode: "",
                    city: ""
                },
                contactInfo: {
                    email: oUserContact.email,
                    phone: oUserContact.phone
                },
                registeredAddress: oUserContact.address,
                totalItems: iTotalItems,
                selectedAddressOption: 0,
                chosenAddress: null
            });

            this._oOrderDialog.setModel(oDialogModel, "orderDialog");
            this._oOrderDialog.open();
        },

        onConfirmOrder: function () {
            var oDialogModel = this._oOrderDialog.getModel("orderDialog");
            var oDialogData = oDialogModel.getData();
            var sAddressText;
            
            // Address Validation Logic 
            var iSelectedAddressOption = oDialogData.selectedAddressOption;
            var oWebshopModel = this.getOwnerComponent().getModel("webshop");


            if (iSelectedAddressOption === 0) {
                var oViewModel = this.getView().getModel("view");
                var oAddressData = oViewModel.getProperty("/UserContact/address");

                if (!oAddressData || !oAddressData.streetName) {
                    MessageBox.error("Der mangler registreret adresseinformation for brugeren.");
                    return;
                }

                sAddressText = oAddressData.streetName + " " + oAddressData.streetNr + ", " +
                                oAddressData.postalCode + " " + oAddressData.city;
            } else {
                // Alternative Address selected (Index 1)
                var oAltAddress = oDialogData.alternativeAddress;
                if (!oAltAddress.streetName || !oAltAddress.streetNr || !oAltAddress.postalCode || !oAltAddress.city) {
                    MessageBox.error("Udfyld venligst alle felter for den alternative adresse.");
                    return;
                }
                sAddressText = oAltAddress.streetName + " " + oAltAddress.streetNr + ", " + oAltAddress.postalCode + " " + oAltAddress.city;
            }
            // ---------------------------------

            // --- Phone Number Validation and Formatting ---
            var oPhoneInput = this.byId("phoneInput");
            var sRawPhone = oPhoneInput.getValue() || "";
            
            // Remove non-digit characters
            var sCleanPhone = sRawPhone.replace(/[^0-9]/g, '');

            if (sCleanPhone.length === 0) {
                // Case 1: Input is completely empty
                MessageBox.error("Telefonnummer er obligatorisk.");
                return; 
            } else if (sCleanPhone.length !== 8) {
                // Case 2: Input is not empty but doesn't have exactly 8 digits
                MessageBox.error("Telefonnummeret skal bestå af præcis 8 cifre (uden landekode).");
                return; 
            }
            
            // If validation passes
            var sFinalPhoneNumber = sCleanPhone;
            oDialogData.contactInfo.phone = sFinalPhoneNumber;
            // -------------------------------------------------------------

            oDialogData.chosenAddress = sAddressText;
            oDialogModel.setData(oDialogData); 

            // Proceed to the next dialog
            this._openFinalConfirmationDialog();
        },

        onCancelOrder: function () {
            this._oOrderDialog.close();
        },
        
        // --- Final Confirmation Dialog Handlers ---

        _openFinalConfirmationDialog: function () {
            if (!this._oFinalConfirmationDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "rm.webshop.test.view.fragment.FinalConfirmationDialog", 
                    controller: this
                }).then(function(oDialog) {
                    this._oFinalConfirmationDialog = oDialog;
                    this.getView().addDependent(oDialog);
                    this._setupFinalConfirmationDialog();
                }.bind(this));
            } else {
                this._setupFinalConfirmationDialog();
            }
        },

        _setupFinalConfirmationDialog: function() {
            var oDialogData = this._oOrderDialog.getModel("orderDialog").getData();
            
            // Populate the fields in the Final Confirmation Dialog
            this.byId("finalAddressText").setText(oDialogData.chosenAddress);
            this.byId("finalEmailText").setText("Email: " + oDialogData.contactInfo.email);
            this.byId("finalPhoneText").setText("Telefon: " + oDialogData.contactInfo.phone);
            this.byId("finalConfirmationText").setText(this.getResourceBundle().getText("Bekræft venligst din bestilling.") || "Bekræft venligst din bestilling.");
            
            this._oFinalConfirmationDialog.open();
        },

        onFinalOrder: function () {
            this._oFinalConfirmationDialog.close();
            this._openOrderSentDialog();
        },

        onFinalCancel: function () {
            this._oFinalConfirmationDialog.close();
        },
        
        // --- Order Sent Dialog Handlers ---

        _openOrderSentDialog: function () {
            if (!this._oOrderSentDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "rm.webshop.test.view.fragment.OrderSentDialog", 
                    controller: this
                }).then(function(oDialog) {
                    this._oOrderSentDialog = oDialog;
                    this.getView().addDependent(oDialog);
                    this._setupOrderSentDialog();
                }.bind(this));
            } else {
                this._setupOrderSentDialog();
            }
        },
        
        _setupOrderSentDialog: function() {
            var oDialogModel = this._oOrderDialog.getModel("orderDialog");
            var sEmail = oDialogModel.getProperty("/contactInfo/email");
            var sMessage;

            // Check if the email address is initial 
            if (!sEmail || sEmail.trim() === "") {
                // Retrieve the formatted phone number from the model
                var sPhone = oDialogModel.getProperty("/contactInfo/phone");
                
                // Use the alternative message with the phone number
                sMessage = "Ordren er bestilt. Du vil modtage en besked på " + sPhone + " ved levering.";
            } else {
                // Use the standard message with the email address
                sMessage = this.getResourceBundle().getText("orderSentConfirmation", [sEmail]);
            }

            var oTextControl = this.byId("orderSentText"); 
            if (oTextControl) {
                oTextControl.setText(sMessage);
            }

            this._oOrderSentDialog.open();
        },

        onOrderSentConfirm: function () {
            this._oOrderSentDialog.close();
            this._processFinalOrder(); 
        },

        _processFinalOrder: function() {
            var that = this;
            var oDialogModel = this._oOrderDialog.getModel("orderDialog");
            var oDialogData = oDialogModel.getData();
            var oODataModel = this.getOwnerComponent().getModel();
            var oViewModel = this.getView().getModel("view");
            const sUserNo       = this._getCurrentUserNo();

            var sChosenAddress = oDialogData.chosenAddress || "";
            var aParts = sChosenAddress.split(',');
            var sStreetPart = aParts[0] ? aParts[0].trim() : "";
            var sCityZipPart = aParts[1] ? aParts[1].trim() : "";

            var sStreet = sStreetPart; 
            var aCityZip = sCityZipPart.split(' ');
            var sZip = aCityZip[0] || ""; 
            var sCity = aCityZip.slice(1).join(' ') || ""; 

            // Get default data in case user didn't edit
            var oUserContact = oViewModel.getProperty("/UserContact") || {};

            var oPayload = {
                "UserNo": sUserNo,
                "Name": oViewModel.getProperty("/UserInfo/navn") || "",
                "Name2": "", 
                "Street": sStreet || oUserContact.address.streetName + " " + oUserContact.address.streetNr,
                "Zip": sZip || oUserContact.address.postalCode,
                "City": sCity || oUserContact.address.city,
                "Att": "",
                "Phone": oDialogData.contactInfo.phone || oUserContact.phone,
                "EMail": oDialogData.contactInfo.email || oUserContact.email
            };

            oODataModel.create("/OrderHeaderSet", oPayload, {
                success: function(oData, oResponse) {
                    var sOrderNumber = oData.OrderNumber || "Ukendt";
                    MessageBox.success("Ordren " + sOrderNumber + " er afsendt.");

                    that._oOrderDialog.close();
                    that._loadBasket(sUserNo);
                    that.getOwnerComponent().getRouter().navTo("Routebestilling");
                },
                error: function(oError) {
                    MessageBox.error("Fejl ved afsendelse af ordre. Prøv igen.");
                    console.error("OrderHeaderSet CREATE error:", oError);
                }
            });
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
                urlParameters: { "$format": "json" },
                success: function(oData) {
                    // Store both header display and order dialog base info
                    oViewModel.setProperty("/UserInfo", {
                        navn: oData.AdrName || "N/A",
                        adresse: oData.AdrStreet || "N/A",
                        zip: oData.AdrZip || "N/A",
                        by: oData.AdrCity || "N/A",
                        tlfnr: oData.Phone || "Ukendt, kan opdateres i 'Profil'",
                        brugernr: oData.UserNo || "N/A",
                        afdeling: oData.Afdeling
                    });

                    oViewModel.setProperty("/UserContact", {
                        email: oData.EMail || "",
                        phone: oData.Phone || "",
                        address: {
                            streetName: oData.AdrStreet || "",
                            streetNr: oData.AdrHouseNo || "",
                            postalCode: oData.AdrZip || "",
                            city: oData.AdrCity || ""
                        }
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

        onBack() {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("Routemain");
        }

    });
});
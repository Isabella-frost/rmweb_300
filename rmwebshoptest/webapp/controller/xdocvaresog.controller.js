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

    return BaseController.extend("rm.webshop.test.controller.xdocvaresog", {
        // Add all dialog properties
        _oOrderDialog: null,
        _oFinalConfirmationDialog: null,
        _oOrderSentDialog: null,
        formatter: Formatter,

        onInit: function () {
            var sLogo = sap.ui.require.toUrl("rm/webshop/test") + "/img/Logo.jpg";
            // 1. Initialize the view model (for UI state and UserInfo header)
            var oViewModel = new JSONModel({
                rmLogo: sLogo,
                basket: [],
                selectedAddressOption: 0,
                selectedTabKey: "HeadXSoegning", 
                selectedList: "Alle varer",
                UserInfo: { 
                    doctor: "", ydernr: "", cvrnr: "", brugernr: ""
                }
            });
            this.getView().setModel(oViewModel, "view");

            // 2. Initialize the webshop data model (for Favorites, Orders, etc.)
            var oWebshopModel = new JSONModel({
                orders: [],
                lists: [] 
            });
            this.getView().setModel(oWebshopModel, "webshop"); 

            this._fetchInitFav();

            this._fetchUserData(); 
            this._fetchFavoriteLists(); 

            this.getOwnerComponent().getRouter().getRoute("Routexdocvaresog").attachPatternMatched(this._onRouteMatched, this);

        },

        _getCurrentUserNo: function () {
            const oGlobalModel = this.getOwnerComponent().getModel("globalUser");
            return oGlobalModel ? oGlobalModel.getProperty("/UserNo") : null;
        },


        _fetchFavoriteLists: function() {
            var oODataModel = this.getOwnerComponent().getModel(); 
            var oWebshopModel = this.getView().getModel("webshop");

            const sUserNo       = this._getCurrentUserNo();

            // 1. Define the hardcoded list item
            const oAllItemsList = {
                UserNo: sUserNo || "",
                FavoriteList: "Alle varer",
                GuidMat: "0"
            };
            
            if (!oODataModel) {
            // If the OData model is unavailable, just set the hardcoded list and exit.
                oWebshopModel.setProperty("/lists", [oAllItemsList]);
                return;
             }

            // Create the filter based on USER_NO
            const aFilters = [
                new Filter("UserNo", FilterOperator.EQ, sUserNo)
            ];

            oODataModel.read("/FavoriteSet", {
                filters: aFilters,
                urlParameters: { 
                    "$format": "json"
                },
                success: function(oData) {
                    
                    let aFavoriteLists = oData.results || [];
                    
                    aFavoriteLists.unshift(oAllItemsList);

                    oWebshopModel.setProperty("/lists", aFavoriteLists);
                }.bind(this),
                error: function(oError) {
                    MessageToast.show("Fejl i load af favoritliste.");
                    // If OData call fails, at least show the hardcoded list
                    oWebshopModel.setProperty("/lists", [oAllItemsList]);
                console.error("OData læs favoritliste fejl:", oError);
                }
            });
        },

        _onRouteMatched: function(oEvent) {
            var oIconTabBar = this.byId("idTopLevelTab");
            if (oIconTabBar) {
                oIconTabBar.setSelectedKey("HeadXSoegning");
            }
            var oViewModel = this.getView().getModel("view");
            var that = this;
            const sUserNo       = this._getCurrentUserNo();


            var checkFav = function() {
                var sSelectedList = oViewModel.getProperty("/selectedList");
                if (sSelectedList) {
//                    that._loadCatalogSet(that.USER_NO, sSelectedList);
                    that._loadBasket(sUserNo);
                } else {
                    // Retry in 100ms until loaded
                    setTimeout(checkFav, 100);
                }
            };
            checkFav();

            this._fetchInitFav();

            this._fetchUserData(); 
            this._fetchFavoriteLists(); 
        },


        // Dialog for choosing/creating favorite list
        _getFavoriteListDialog: function () {
            if (!this._oFavoriteListDialog) {
                this._oFavoriteListDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: "rm.webshop.test.view.fragment.FavoriteListDialog",
                    controller: this
                }).then(function (oDialog) {
                    this.getView().addDependent(oDialog);
                    return oDialog;
                }.bind(this));
            }
            return this._oFavoriteListDialog;
        },

        onAddToFavoriteList: function (oEvent) {
            // Get the current material data from the binding context
            const oContext = oEvent.getSource().getBindingContext("view");
            const oMaterial = oContext.getObject();
            
            // Store the material data in a temporary model property for access in the dialog
            this.getView().getModel("webshop").setProperty("/materialToAdd", oMaterial);

            // Set the initial state for the new list input
            this.getView().getModel("webshop").setProperty("/newListName", "");

            this._getFavoriteListDialog().then(function (oDialog) {
                // Set the initial state: ComboBox visible, Input hidden
                this.byId("listSelectContainer").setVisible(true);
                this.byId("newListInputContainer").setVisible(false);
                this.byId("saveListButton").setText(this.getResourceBundle().getText("selectListSave"));
                oDialog.open();
            }.bind(this));
        },
        
        onCreateNewList: function () {
            // Switch UI to show the input field and hide the ComboBox
            this.byId("listSelectContainer").setVisible(false);
            this.byId("newListInputContainer").setVisible(true);
            this.byId("saveListButton").setText(this.getResourceBundle().getText("createListSave"));
        },

        onSaveFavoriteList: function (oEvent) {
            const oWebshopModel = this.getView().getModel("webshop");
            const oViewModel = this.getView().getModel("view"); 
            const oMaterial = oWebshopModel.getProperty("/materialToAdd");
            const oODataModel = this.getOwnerComponent().getModel();
            const sUserNo       = this._getCurrentUserNo();
            
            let sFavoriteListName;

            if (this.byId("newListInputContainer").getVisible()) {
                // Case 1: Creating a new list
                sFavoriteListName = oWebshopModel.getProperty("/newListName").trim();
                if (!sFavoriteListName) {
                    MessageToast.show(this.getResourceBundle().getText("listNameRequired"));
                    return;
                }
            } else {
                // Case 2: Selecting an existing list
                const oSelectedItem = this.byId("favoriteListDialogSelect").getSelectedItem();
                if (!oSelectedItem) {
                    MessageToast.show(this.getResourceBundle().getText("listSelectionRequired"));
                    return;
                }
                // Get the list name from the selected item's text
                sFavoriteListName = oSelectedItem.getText(); 
            }
            
            // 3. Prepare the OData payload
            const oPayload = {
                UserNo: sUserNo,
                FavoriteList: sFavoriteListName,
                GuidMat: oMaterial.GuidMat 
            };

            // 4. Perform OData Create
            oODataModel.create("/FavoriteSet", oPayload, {
                success: function (oData) {
                    MessageToast.show(this.getResourceBundle().getText("favoriteAddSuccess", [sFavoriteListName]));
                    this.byId("favoriteListDialog").close();
                    
                    const sCurrentSelectedList = oViewModel.getProperty("/selectedList");

                    // 1. Re-fetch lists if a NEW list was created (to update the main ComboBox)
                    if (this.byId("newListInputContainer").getVisible()) {
                        this._fetchFavoriteLists();
                    }

                    // 2. RELOAD THE CATALOG SET: 
                    // Only reload if the user is currently viewing the list that was just updated.
                    if (sFavoriteListName === sCurrentSelectedList || sCurrentSelectedList === "Alle varer") {
                        this._loadCatalogSet(sUserNo, sCurrentSelectedList);
                    }
                    
                }.bind(this),
                error: function (oError) {
                    MessageBox.error(this.getResourceBundle().getText("Fejl ved tilføjelse af favoritliste", [sFavoriteListName]));
                    console.error("Oprettelse af favoritliste er fejlet:", oError);
                }.bind(this)
            });
        },

        onCloseFavoriteListDialog: function () {
            this.byId("favoriteListDialog").close();
        },

        _getRemoveFromListDialog: function() {
            if (!this._oRemoveFromListDialog) {
                // Load the new dedicated fragment
                this._oRemoveFromListDialog = sap.ui.core.Fragment.load({
                    // Note: Since the fragment has unique IDs, we don't need a unique ID prefix here.
                    id: this.getView().getId(), 
                    name: "rm.webshop.test.view.fragment.RemoveFromFavoriteListDialog", 
                    controller: this
                }).then(function (oDialog) {
                    this.getView().addDependent(oDialog);
                    return oDialog;
                }.bind(this));
            }
            return this._oRemoveFromListDialog;
        },

        onRemoveFromFavoriteList: function (oEvent) {
            // 1. Get the current material data from the binding context (from the catalog list item)
            const oContext = oEvent.getSource().getBindingContext("view");
            const oMaterial = oContext.getObject();
            
            // Store the material data in a temporary model property for access in the dialog
            this.getView().getModel("webshop").setProperty("/materialToRemove", oMaterial);
            
            // 2. Filter the available favorite lists to only show those the item belongs to.
            const sFavoritesString = oMaterial.IncludedInFavorites || ""; // e.g., "List A, List B"
            const aCurrentLists = sFavoritesString.split(',').map(s => s.trim()).filter(s => s && s !== "Alle varer");

            // Get the full list data (all favorite lists)
            const aAllLists = this.getView().getModel("webshop").getProperty("/lists")
                                            .filter(list => list.FavoriteList !== "Alle varer");

            // Filter the full list to only include lists where the material is currently included
            const aRemovableLists = aAllLists.filter(list => aCurrentLists.includes(list.FavoriteList));

            // Store the filtered list in a temporary path which is bound to the Select control in the fragment
            this.getView().getModel("webshop").setProperty("/removableLists", aRemovableLists);


            // 3. Open the dialog
            this._getRemoveFromListDialog().then(function (oDialog) {
                // Clear any previous selection when opening
                this.byId("favoriteListDialogSelectRemove").setSelectedKey(null);
                oDialog.open();
            }.bind(this));
        },

        /**
         * Executes the OData DELETE request to remove the material from the selected favorite list.
         */
        onConfirmRemoveFavorite: function () {
            const oWebshopModel = this.getView().getModel("webshop");
            const oViewModel = this.getView().getModel("view");
            const oODataModel = this.getOwnerComponent().getModel();
            const sUserNo       = this._getCurrentUserNo();
            
            // 1. Get material and selected list from the dialog controls
            const oMaterial = oWebshopModel.getProperty("/materialToRemove");
            const oSelect = this.byId("favoriteListDialogSelectRemove");

            const sFavoriteListName = oSelect.getSelectedKey();

            if (!sFavoriteListName) {
                sap.m.MessageToast.show(this.getResourceBundle().getText("listSelectionRequired"));
                return;
            }
            
            // 2. Construct the OData DELETE path (composite key)
            const sPath = oODataModel.createKey("/FavoriteSet", {
                UserNo: sUserNo,
                FavoriteList: sFavoriteListName,
                GuidMat: oMaterial.GuidMat
            });

            // 3. Perform OData DELETE
            oODataModel.remove(sPath, {
                success: function (oData) {
                    sap.m.MessageToast.show(this.getResourceBundle().getText("Varen blev fjernet"));
                    
                    this.byId("favoriteListDialogRemove").close();
                    
                    const sCurrentSelectedList = oViewModel.getProperty("/selectedList");

                    // 4. RELOAD THE CATALOG SET: 
                    if (sFavoriteListName === sCurrentSelectedList || sCurrentSelectedList === "Alle varer") {
                        this._loadCatalogSet(sUserNo, sCurrentSelectedList);
                    }
                    
                }.bind(this),
                error: function (oError) {
                    sap.m.MessageBox.error(this.getResourceBundle().getText("Varen blev ikke fjernet fra favoritlisten. Prøv igen."));
                    console.error("FavoriteSet Delete er fejlet:", oError);
                }.bind(this)
            });
        },

        /**
         * Closes the Remove from Favorite List Dialog.
         */
        onCloseRemoveFromListDialog: function () {
            this.byId("favoriteListDialogRemove").close();
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
                    sap.m.MessageBox.error("Fejl ved load af varekurv data. Genindlæs siden.");
                    console.error("BasketSet read error", oError);
                }
            });
        },

        onFilterMaterialsByList: function (oEvent) {
            const sUserNo       = this._getCurrentUserNo();
            // Get the key of the selected item from the 'view' model property
            var sSelectedListKey = this.getView().getModel("view").getProperty("/selectedList");

            // Trigger the catalog load with the new filter
            this._loadCatalogSet(sUserNo, sSelectedListKey);
        },

        _loadCatalogSet: function (sUserNo, sFavoriteList) {
            var oODataModel = this.getOwnerComponent().getModel();
            var oViewModel = this.getView().getModel("view");

            // Local reference to Filter classes (assuming they are available in the scope)
            var Filter = sap.ui.model.Filter;
            var FilterOperator = sap.ui.model.FilterOperator;

            // Build filter array, starting with the mandatory UserNo filter
            var aFilters = [
                new Filter("UserNo", FilterOperator.EQ, sUserNo)
            ];

            // Conditionally add FavoriteList filter
            // If sFavoriteList is not empty and not the 'Alle varer' key, apply the filter.
            if (sFavoriteList && sFavoriteList !== "Alle varer" && sFavoriteList !== "") {
                aFilters.push(new Filter("FavoriteList", FilterOperator.EQ, sFavoriteList));
            }

            //SHow busy indicator
            sap.ui.core.BusyIndicator.show(0);

            // Call OData read
            oODataModel.read("/CatalogSet", {
                filters: aFilters,
                urlParameters: {
                    // Mandate $expand to get associated attributes
                    "$expand": "CatalogAttributeSet",
                    "$format": "json"
                },
                success: function (oData, response) {
                    sap.ui.core.BusyIndicator.hide();
                    // Store result in view model
                    oViewModel.setProperty("/catalog", oData.results);

                    // Clear client-side search filter when a new list is loaded
                    var oSearchField = this.byId("searchField");
                    if (oSearchField && oSearchField.getValue() !== "") {
                        oSearchField.setValue("");
                        // Also clear the binding's existing filters if the search was active
                        var oList = this.getView().byId("catalogList");
                        oList.getBinding("items").filter([]);
                    }

                    console.log("CatalogSet loaded successfully for list:", sFavoriteList || "Alle varer");
                }.bind(this), // Use .bind(this) to maintain controller context
                error: function (oError) {
                    sap.ui.core.BusyIndicator.hide();
                    sap.m.MessageBox.error("Fejl ved load af katalogdata: " + (sFavoriteList || "Alle varer"));
                    console.error("CatalogSet read error", oError);
                }.bind(this) // Use .bind(this) to maintain controller context
            });
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
                // This means the item is shown if the query is found in EITHER Matnr OR Maktx
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
                    MessageBox.error("Der skete en fejl ved opdatering af varekurven.");
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

            // Calculate the payload quantity
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
                    MessageBox.error("Fejl ved fjernelse af vare fra kurv. Prøv venligst igen.");
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
                registeredAddress: oUserContact.address, // keep for clarity
                totalItems: iTotalItems,
                selectedAddressOption: 0,
                chosenAddress: null
            });

            this._oOrderDialog.setModel(oDialogModel, "orderDialog");
            this._oOrderDialog.open();
        },

        onConfirmOrder: function () {
            var MessageBox = sap.m.MessageBox;

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
            
            // --- Email Validation ---
            var oEmailInput = this.byId("emailInput");
            // Ensure we handle potential null/undefined input gracefully
            var sEmail = oEmailInput ? oEmailInput.getValue() : ""; 
            sEmail = sEmail.trim(); // Remove leading/trailing spaces

            if (!sEmail) {
                MessageBox.error("Udfyld venligst email-adressen for kontaktinformation.");
                return;
            }
            
            // Store the cleaned email back into the model data (optional, but good practice)
            oDialogData.contactInfo.email = sEmail;
            // -----------------------------

            // --- Phone Number Validation and Formatting ---
            var oPhoneInput = this.byId("phoneInput");
            var sRawPhone = oPhoneInput.getValue() || "";

            var sCleanPhone = sRawPhone.replace(/[^0-9]/g, '');

            if (sCleanPhone.length > 0) {
                // Only validate if the user entered a non-empty value
                if (sCleanPhone.length !== 8) {
                    MessageBox.error("Telefonnummeret skal bestå af præcis 8 cifre (uden landekode), hvis det udfyldes.");
                    return; 
                }
                
                var sFinalPhoneNumber = sCleanPhone;
                oDialogData.contactInfo.phone = sFinalPhoneNumber;
            } else {
                // If the input is empty, ensure the model property is cleared
                oDialogData.contactInfo.phone = null;
            }
            // -------------------------------------------------------------

            oDialogData.chosenAddress = sAddressText;
            oDialogModel.setData(oDialogData); 

            // Proceed to the next dialog
            this._openFinalConfirmationDialog();
        },
        
        onCancelOrder: function () {
            this._oOrderDialog.close();
        },

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
            
            var sMessage = this.getResourceBundle().getText("orderSentConfirmation", [sEmail]);

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
                "Name": oViewModel.getProperty("/UserInfo/doctor") || "",
                "Name2": "", // optional, no second field from UserSet
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
                    that.getOwnerComponent().getRouter().navTo("Routexdocbestilling");
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
                        doctor: oData.AdrName || "N/A",
                        ydernr: oData.Ydernr || "N/A",
                        cvrnr: oData.Cvr || "N/A",
                        brugernr: oData.UserNo || "N/A"
                    });

                    // Store address/contact info for order dialogs
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
                        doctor: "Fejl: Kunne ikke hente data",
                        ydernr: "", cvrnr: "", brugernr: ""
                    });
                }.bind(this)
            });
        },
        
        _fetchInitFav: function() {
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
                    const sFav = oData.FavoriteList || "Alle varer";
                    oViewModel.setProperty("/selectedList", sFav);
                    this._loadCatalogSet(sUserNo, sFav);
                }.bind(this),
                error: function() {
                    MessageToast.show("Fejl i søgning efter favoritliste ved start");
                }.bind(this)
            });
        },

        onBack() {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("Routemain");
        }

    });
});
sap.ui.define([
    "./BaseController",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox", 
    "sap/ui/model/Filter", 
    "sap/ui/model/FilterOperator",
    "./Formatter"
],
function (BaseController, MessageToast, JSONModel, MessageBox, Filter, FilterOperator, Formatter) {
    "use strict";

    return BaseController.extend("rm.webshop.shop.controller.bestilling", {
        
        formatter: Formatter,
        
        onInit: function () {
            var sLogo = sap.ui.require.toUrl("rm/webshop/shop") + "/img/Logo.jpg";
            var oViewModel = new JSONModel({
                rmLogo: sLogo,
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

            this._fetchUserData();

            this.getOwnerComponent().getRouter().getRoute("Routebestilling").attachPatternMatched(this._onRouteMatched, this);
        },

        _getCurrentUserNo: function () {
            const oGlobalModel = this.getOwnerComponent().getModel("globalUser");
            return oGlobalModel ? oGlobalModel.getProperty("/UserNo") : null;
        },

        _onRouteMatched: function (oEvent) {
            const sUserNo       = this._getCurrentUserNo();

            var oIconTabBar = this.byId("idTopLevelTab");
            if (oIconTabBar) {
                oIconTabBar.setSelectedKey("HeadOversigt");
            }

            this._loadOrderHeaders(sUserNo);
            this._fetchUserData();
        },

        _loadOrderHeaders: function (sUserNo) {
            var oODataModel = this.getOwnerComponent().getModel();
            var oOrderList = this.byId("orderList");
            var that = this;

            var aFilters = [ new sap.ui.model.Filter("UserNo", sap.ui.model.FilterOperator.EQ, sUserNo) ];

            oODataModel.read("/OrderHeaderSet", {
                filters: aFilters,
                urlParameters: {
                    "$expand": "OrderItemSet,OrderItemSet/TrackTraceSet"
                },
                success: function (oData) {
                    var aOrders = oData.results.map(function (oOrder) {

                        // Map each OrderItem
                        oOrder.items = oOrder.OrderItemSet.results.map(function (oItem) {
                            // Default empty URL
                            var sUrl = "";

                            // Collect all tracking links
                                if (oItem.TrackTraceSet && oItem.TrackTraceSet.results && oItem.TrackTraceSet.results.length > 0) {
                                    oItem.TrackTraces = oItem.TrackTraceSet.results.map(function(tt) {
                                        return {
                                            UrlTrackTrace: tt.UrlTrackTrace,
                                            TtStatusText: tt.TtStatusText || "",
                                            OrderQuantity: tt.OrderQuantity || "",
                                            CreateDateEdit: tt.CreateDateEdit || ""
                                        };
                                    });
                                } else {
                                    oItem.TrackTraces = [];
                                }
                            // Clean up
                            delete oItem.TrackTraceSet;
                            return oItem;
                        });

                        delete oOrder.OrderItemSet;
                        return oOrder;
                    });

                    // Create JSON model for view binding
                    var oOrdersModel = new sap.ui.model.json.JSONModel({ orders: aOrders });
                    that.getView().setModel(oOrdersModel, "ordersModel");

                    // Re-bind list
                    oOrderList.bindItems({
                        path: "ordersModel>/orders",
                        template: oOrderList.getItems()[0].clone()
                    });

                    // Auto-select first order and load its details
                    oOrderList.attachEventOnce("updateFinished", function () {
                        var aItems = oOrderList.getItems();
                        if (aItems.length > 0) {
                            oOrderList.setSelectedItem(aItems[0], true);
                            that.onOrderSelect(aItems[0]);
                        }
                    });

                    // Apply show/hide closed orders filter
                    var oCheckbox = that.byId("showClosedOrdersCheckbox");
                    that.onShowClosedOrdersToggle({ getParameter: () => oCheckbox.getSelected() });

                    console.log("OrderHeaderSet (with TrackTraceSet) loaded:", aOrders.length, "orders");
                },
                error: function (oError) {
                    sap.m.MessageBox.error("Failed to load order history data (with TrackTrace).");
                    console.error("OrderHeaderSet read error:", oError);
                }
            });
        },

        onShowClosedOrdersToggle: function(oEvent) {
            var bShowClosed = oEvent.getParameter("selected");
            var oOrderList = this.byId("orderList");
            var oBinding = oOrderList.getBinding("items");

            if (!oBinding) return; // List not yet bound

            // If the checkbox is checked, remove filters (show all)
            if (bShowClosed) {
                oBinding.filter([]); 
            } else {
                // Only show orders where HeaderStatus != 'CONF'
                var oFilter = new sap.ui.model.Filter({
                    path: "HeaderStatus",
                    operator: sap.ui.model.FilterOperator.NE,
                    value1: "SHIP"
                });
                oBinding.filter([oFilter]);
            }
        },
        
        onOrderSelect: function(oEvent) {
            // Check if oEvent is the list item itself (from the auto-select logic)
            var oListItem = oEvent.getParameter ? oEvent.getParameter("listItem") : oEvent;
            
            // Get the binding context from the 'ordersModel'
            var oBindingContext = oListItem.getBindingContext("ordersModel"); 
            
            if (!oBindingContext) return;

            var sPath = oBindingContext.getPath();

            // Bind the detail list (orderItemsList) to the selected order's items
            var oOrderItemsList = this.byId("orderItemsList");
            if (oOrderItemsList) {
                // The nested order items are now under '/items' in the JSON model
                oOrderItemsList.bindItems({
                    path: sPath + "/items", // Path is ordersModel>/orders/X/items
                    model: "ordersModel",
                    template: oOrderItemsList.getItems()[0].clone() 
                });
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

        onCopyOrderItem: function (oEvent) {
            // 1. Get the control that fired the event (the Button)
            var oButton = oEvent.getSource();

            // 2. Get the binding context of the Button's parent item (bound to 'ordersModel')
            var oContext = oButton.getBindingContext("ordersModel"); 

            if (!oContext) {
                MessageToast.show("Fejl: Kunne ikke finde vareoplysninger.");
                return;
            }

            // 3. Get the data object from the context (the OrderItem entity)
            var oOrderItemData = oContext.getObject(); 

            // 4. Prepare payload fields
            const sUserNo       = this._getCurrentUserNo();
            var sGuidMat = oOrderItemData.GuidMat; 
            var sMatnr = oOrderItemData.Matnr; 
            var sOrderQuantity = String(oOrderItemData.OrderQuantity); 

            var oPayload = {
                UserNo: sUserNo,
                GuidMat: sGuidMat,
                OrderQuantity: sOrderQuantity
            };

            // 5. Get the OData model (mainService)
            var oODataModel = this.getOwnerComponent().getModel();

            // 6. Define the entity set path
            var sPath = "/BasketSet";

            // 7. Perform the OData POST request (CREATE)
            oODataModel.create(sPath, oPayload, {
                success: function (oData) { 
                    if (this._loadBasket) { 
                        this._loadBasket(sUserNo);
                    }

                    // Show success message
                    MessageToast.show(oOrderItemData.Maktx + " (" + sOrderQuantity + " stk) tilføjet til kurv");
                }.bind(this),

                error: function (oError) {
                    var sErrorMessage = "Fejl: Kunne ikke tilføje vare til kurven. Prøv venligst igen.";

                    try {
                        if (oError && oError.responseText) {
                            var oErrorObj = JSON.parse(oError.responseText);

                            // Prefer the detailed message first
                            if (
                                oErrorObj.error &&
                                oErrorObj.error.innererror &&
                                oErrorObj.error.innererror.errordetails &&
                                oErrorObj.error.innererror.errordetails.length > 0
                            ) {
                                sErrorMessage = oErrorObj.error.innererror.errordetails[0].message || sErrorMessage;
                            }
                            // Otherwise use the top-level message
                            else if (oErrorObj.error && oErrorObj.error.message && oErrorObj.error.message.value) {
                                sErrorMessage = oErrorObj.error.message.value;
                            }
                        } else if (oError && oError.message) {
                            sErrorMessage = oError.message;
                        }
                    } catch (e) {
                        console.error("Fejl ved parsing af OData fejl:", e);
                    }

                    // Show error message to user
                    MessageBox.error(sErrorMessage);
                    console.error("BasketSet create error for item " + sMatnr + ":", oError);
                }.bind(this)
            });
        },

        onCopyOrder: async function() {
            var oOrderItemsList = this.byId("orderItemsList");
            var aItems = oOrderItemsList.getItems(); 
            var that = this;
            var aUnavailableItems = []; // Array to collect Maktx of unavailable items
            var iSuccessCount = 0;
            const sUserNo       = this._getCurrentUserNo();

            if (aItems.length === 0) {
                sap.m.MessageToast.show("Ingen varer at kopiere.");
                return;
            }

            // Show a busy indicator during processing
            sap.ui.core.BusyIndicator.show(0); 
            
            // 1. Loop through each order item and call the creation logic
            for (const oListItem of aItems) {
                var oContext = oListItem.getBindingContext("ordersModel");
                var oItemData = oContext.getObject();

                var oPayload = {
                    UserNo: sUserNo,
                    GuidMat: oItemData.GuidMat,
                    OrderQuantity: String(oItemData.OrderQuantity) 
                };

                try {
                    // Await the OData call. We pass Maktx as a separate argument to the helper.
                    await this._createBasketItem(oPayload, oItemData.Maktx);
                    iSuccessCount++;
                } catch (sErrorMaterialName) {
                    // Catch the material name (Maktx) rejected by the helper
                    aUnavailableItems.push(sErrorMaterialName);
                }
            }
            
            // Hide the busy indicator
            sap.ui.core.BusyIndicator.hide();

            // 2. Refresh the basket and show notifications
            if (that._loadBasket) {
                that._loadBasket(sUserNo);
            }
            
            // Show a pop-up with unavailable items
            if (aUnavailableItems.length > 0) {
                var sUnavailableList = aUnavailableItems.join(", \n");
                var sMessage = `Følgende ${aUnavailableItems.length} varer kunne IKKE tilføjes til kurven, da de ikke længere er tilgængelige:\n\n${sUnavailableList}`;
                sap.m.MessageBox.warning(sMessage, {
                    title: "Nogle varer er utilgængelige"
                });
            }

            // Show overall success message
            if (iSuccessCount > 0) {
                sap.m.MessageToast.show(`${iSuccessCount} vare(r) fra ordren er tilføjet til kurven.`);
            } else if (aUnavailableItems.length > 0) {
                sap.m.MessageToast.show("Ingen varer blev tilføjet til kurven.");
            }
        },

        _createBasketItem: function(oPayload, sMaterialName) {
            var oODataModel = this.getOwnerComponent().getModel();
            var sPath = "/BasketSet";
            
            return new Promise((resolve, reject) => {
                oODataModel.create(sPath, oPayload, {
                    // This is the item-by-item creation
                    success: function(oData) {
                        // Success: Resolve the promise
                        resolve();
                    },
                    error: function(oError) {
                        // We know exactly which item caused the error because of the loop.
                        // We reject the Promise with the item's Maktx (sMaterialName) 
                        // regardless of the technical error message.
                        console.error(`Error adding item ${sMaterialName} to basket:`, oError);
                        reject(sMaterialName); 
                    }
                });
            });
        },

        onBack() {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("Routemain");
        }
    });
});
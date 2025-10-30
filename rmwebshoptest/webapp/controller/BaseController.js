sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox"
    ],
    function (Controller, MessageBox) {
        "use strict";

        return Controller.extend("rm.webshop.test.controller.BaseController", {

            getModelHandler: function(){
                return this.getOwnerComponent().getModelHandler();
            },

            getFormatters: function(){
//                return formatters;
            },

            /**
             * Convenience method for accessing the router in every controller of the application.
             * @public
             * @returns {sap.ui.core.routing.Router} the router for this component
             */
            getRouter : function () {
                return this.getOwnerComponent().getRouter();
            },

            /**
             * Convenience method for routing to another route.
             * @public
             */
            navTo: function(name, parms, target, replace){
                this.getRouter().navTo(name, parms, target, replace);
            },

            /**
             * Convenience method for getting the view model by name in every controller of the application.
             * @public
             * @param {string} sName the model name
             * @returns {sap.ui.model.Model} the model instance
             */
            getModel : function (sName) {
                return this.getView().getModel(sName);
            },

            /**
             * Convenience method for setting the view model in every controller of the application.
             * @public
             * @param {sap.ui.model.Model} oModel the model instance
             * @param {string} sName the model name
             * @returns {sap.ui.mvc.View} the view instance
             */
            setModel : function (oModel, sName) {
                return this.getView().setModel(oModel, sName);
            },

            /**
             * Convenience method for getting the resource bundle.
             * @public
             * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
             */
            getResourceBundle : function () {
                return this.getOwnerComponent().getModel("i18n").getResourceBundle();
            },

            /**
             * Event handler for navigating back.
             * It there is a history entry or an previous app-to-app navigation we go one step back in the browser history
             * If not, it will replace the current entry of the browser history with the master route.
             * @public
             */
            onNavBack : function() {
                var sPreviousHash = History.getInstance().getPreviousHash(),
                    oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");

                if (sPreviousHash !== undefined || !oCrossAppNavigator.isInitialNavigation()) {
                    // eslint-disable-next-line sap-no-history-manipulation
                    history.go(-1);
                } else {
                    this.getRouter().navTo("master", {}, true);
                }
            },

            showSuccessMessageBox: function (msg, title) {
                MessageBox.show(
                    msg, {
                        icon: MessageBox.Icon.SUCCESS,
                        title: title,
                        actions: [MessageBox.Action.OK],
                        onClose: function (oAction) {}
                    }
                );
            },

            showWarningMessageBox: function (msg, title) {
                MessageBox.show(
                    msg, {
                        icon: MessageBox.Icon.WARNING,
                        title: title,
                        actions: [MessageBox.Action.OK],
                        onClose: function (oAction) {}
                    }
                );
            },

            showErrorMessageBox: function (msg, title) {
                MessageBox.show(
                    msg, {
                        icon: MessageBox.Icon.ERROR,
                        title: title,
                        actions: [MessageBox.Action.OK],
                        onClose: function (oAction) {}
                    }
                );
            },

            showErrorConfMessageBoxPromise: function (msg, title, action) {
                var aActions = [];
                if(action){
                    aActions.push(action);
                    aActions.push(MessageBox.Action.CANCEL);
                }else{
                    aActions.push(MessageBox.Action.OK);
                }
                return new Promise(function (resolve, reject) {
                    MessageBox.show(
                        msg, {
                            icon: MessageBox.Icon.ERROR,
                            title: title,
                            actions: aActions,
                            onClose: function (oAction) {
                                (oAction === sap.m.MessageBox.Action.OK || oAction === action) ? resolve() : reject();
                            }
                        }
                    );
                });
            },

            showConfirmMsgBoxPromise: function(msg, title){
                return new Promise(function (resolve, reject) {
                    MessageBox.confirm(
                        msg, {
                            title: title,
                            onClose: function (oAction) {
                                (oAction === sap.m.MessageBox.Action.OK) ? resolve() : reject();
                            }
                        }
                    );
                });
            }            
            

        });
    });
sap.ui.define([
    "./BaseController",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel"
], (BaseController, MessageToast, JSONModel) => {
    "use strict";

    return BaseController.extend("rm.webshop.test.controller.vaelgklinik", {
        onInit() {},

        onSelectClinic(oEvent) {
            const oItem     = oEvent.getParameter("listItem");
            const oSelected = oItem.getBindingContext("loginUsers").getObject();
            const sUserNo   = oSelected.UserNo;

            const oGlobalModel = this.getOwnerComponent().getModel("globalUser");
            oGlobalModel.setProperty("/UserNo", sUserNo);
            oGlobalModel.setProperty("/User", oSelected);

            try {
                window.localStorage.setItem("rm.webshop.globalUser", JSON.stringify(oGlobalModel.getData()));
            } catch (e) {}

            sap.m.MessageToast.show("Valgt bruger: " + sUserNo);

            // ✅ Check user type and navigate accordingly
            const oLoginContext = this.getOwnerComponent().getModel("loginContext");
            const sRole = oLoginContext?.getProperty("/role");

            const oRouter = this.getOwnerComponent().getRouter();

            if (sRole === "patient") {
                oRouter.navTo("Routevaresog");   // your patient start view
            } else {
                oRouter.navTo("Routeinfo");      // your doctor info view
            }
        }

    });
});

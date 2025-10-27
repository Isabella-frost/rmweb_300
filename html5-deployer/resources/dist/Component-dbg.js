sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/json/JSONModel",
  "rm/webshop/shop/model/models"
], (UIComponent, JSONModel, models) => {
  "use strict";

  return UIComponent.extend("rm.webshop.shop.Component", {
    metadata: {
      manifest: "json",
      interfaces: ["sap.ui.core.IAsyncContentCreation"]
    },

    init() {
      // base init
      UIComponent.prototype.init.apply(this, arguments);

      // device model (unchanged)
      this.setModel(models.createDeviceModel(), "device");

      // --- Global user model (created ONCE for the whole app) ---
      const oGlobalModel = new JSONModel({
        UserNo: null,  // selected user number
        User:   null   // optional: full selected user object
      });
      this.setModel(oGlobalModel, "globalUser");

      // Restore from localStorage if available (optional)
      try {
        const sSaved = window.localStorage.getItem("rm.webshop.globalUser");
        if (sSaved) {
          oGlobalModel.setData(JSON.parse(sSaved));
        }
      } catch (e) {
        // ignore storage errors
      }

      // Persist any changes to the global model automatically (optional)
      oGlobalModel.attachPropertyChange(() => {
        try {
          window.localStorage.setItem("rm.webshop.globalUser", JSON.stringify(oGlobalModel.getData()));
        } catch (e) {
          // ignore storage errors
        }
      });

      // enable routing
      this.getRouter().initialize();
    }
  });
});

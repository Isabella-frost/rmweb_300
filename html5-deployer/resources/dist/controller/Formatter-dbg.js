sap.ui.define([], function () {
    "use strict";
    return {
        /**
         * Formats the picture URL, providing a fallback if empty.
         * @param {string} sUrl The URL from the OData service.
         * @returns {string} The resolved URL or the fallback path.
         */
        pictureUrl: function (sUrl) {
            var sLogo = sap.ui.require.toUrl("rm/webshop/shop") + "/img/billedevej.jpg";
            // NOTE: The formatter function does *not* have access to 'this' (the controller) 
            // so we must use a relative path for the fallback image.
            if (!sUrl || sUrl.trim() === "") {
                // Assuming 'img' folder is at the root of your webapp
                return sLogo; // Relative fallback image path
            }
            return sUrl;
        }
    };
});
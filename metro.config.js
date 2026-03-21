const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

if (!Array.prototype.toReversed) {
    Array.prototype.toReversed = function () {
        return this.slice().reverse();
    };
}

console.log("Metro running with Node version:", process.version);

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: "./global.css" });

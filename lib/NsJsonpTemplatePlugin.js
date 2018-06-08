/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var NsJsonpMainTemplatePlugin = require("./NsJsonpMainTemplatePlugin");
var NsJsonpChunkTemplatePlugin = require("./NsJsonpChunkTemplatePlugin");
var NsJsonpHotUpdateChunkTemplatePlugin = require("./NsJsonpHotUpdateChunkTemplatePlugin");

function JsonpTemplatePlugin() {}
module.exports = JsonpTemplatePlugin;
JsonpTemplatePlugin.prototype.apply = function(compiler) {
	compiler.hooks.compilation.tap("this-compilation", function(compilation) {
		compilation.mainTemplate.apply(new NsJsonpMainTemplatePlugin(compilation));
		compilation.chunkTemplate.apply(new NsJsonpChunkTemplatePlugin(compilation));
		compilation.hotUpdateChunkTemplate.apply(new NsJsonpHotUpdateChunkTemplatePlugin(compilation));
	});
};

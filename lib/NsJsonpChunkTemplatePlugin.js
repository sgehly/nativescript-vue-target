/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ConcatSource = require("webpack-sources").ConcatSource;
var Template = require("webpack/lib/Template");

function JsonpChunkTemplatePlugin() { }
module.exports = JsonpChunkTemplatePlugin;

JsonpChunkTemplatePlugin.prototype.apply = function(compilation) {

	//JSONP version
	compilation.hooks.render.tap("render", function (modules, chunk) {
		var jsonpFunction = this.outputOptions.jsonpFunction;
		var source = new ConcatSource();
		source.add(jsonpFunction + "(" + JSON.stringify(chunk.ids) + ",");
		source.add(modules);
		var entries = [chunk.entryModule].filter(Boolean).map(function (m) {
			return m.id;
		});
		if (entries.length > 0) {
			source.add("," + JSON.stringify(entries));
		}
		source.add(")");
		return source;
	});
	compilation.hooks.hash.tap("hash", function (hash) {
		hash.update("JsonpChunkTemplatePlugin");
		hash.update("3");
		hash.update(compilation.outputOptions.jsonpFunction + "");
		hash.update(compilation.outputOptions.library + "");
	});
};

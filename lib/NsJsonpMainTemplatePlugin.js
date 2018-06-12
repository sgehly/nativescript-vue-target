/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var Template = require("webpack/lib/Template");

function JsonpMainTemplatePlugin() { }
module.exports = JsonpMainTemplatePlugin;

JsonpMainTemplatePlugin.prototype.constructor = JsonpMainTemplatePlugin;
JsonpMainTemplatePlugin.prototype.apply = function(compilation) {
	compilation.hooks.localVars.tap("local-vars", function (source, chunk) {

		var chunks = []	
		for (const chunkGroup of chunk.groupsIterable) {
			chunks.concat(chunkGroup.getChildren())
		}

		if (chunks.length > 0) {
			return this.asString([
				source,
				"// objects to store loaded and loading chunks",
				"var installedChunks = {",
				this.indent(
					chunk.ids.map(function (id) {
						return id + ": 0";
					}).join(",\n")
				),
				"};"
			]);
		}
		return source;
	});
	
	compilation.hooks.requireEnsure.tap("require-ensure", function (_, chunk, hash) {
		var chunkFilename = this.outputOptions.chunkFilename;
		var chunkMaps = chunk.getChunkMaps();
		var insertMoreModules = [
			"var moreModules = chunk.modules, chunkIds = chunk.ids;",
			"for(var moduleId in moreModules) {",
			this.indent(this.renderAddModule(hash, chunk, "moduleId", "moreModules[moduleId]")),
			"}"
		];

		var request = this.applyPluginsWaterfall("asset-path", JSON.stringify("./" + chunkFilename), {
			hash: "\" + " + this.renderCurrentHashCode(hash) + " + \"",
			hashWithLength: function (length) {
				return "\" + " + this.renderCurrentHashCode(hash, length) + " + \"";
			}.bind(this),
			chunk: {
				id: "\" + chunkId + \"",
				hash: "\" + " + JSON.stringify(chunkMaps.hash) + "[chunkId] + \"",
				hashWithLength: function (length) {
					var shortChunkHashMap = {};
					Object.keys(chunkMaps.hash).forEach(function (chunkId) {
						if (typeof chunkMaps.hash[chunkId] === "string")
							shortChunkHashMap[chunkId] = chunkMaps.hash[chunkId].substr(0, length);
					});
					return "\" + " + JSON.stringify(shortChunkHashMap) + "[chunkId] + \"";
				},
				name: "\" + (" + JSON.stringify(chunkMaps.name) + "[chunkId]||chunkId) + \""
			}
		});

		return "if(installedChunks[chunkId] !== 0) {var chunk = require(" + request + ");} return Promise.resolve();"
	});
	compilation.hooks.requireExtensions.tap("require-extensions", function (source, chunk) {
		var chunks = []	
		for (const chunkGroup of chunk.groupsIterable) {
			chunks.concat(chunkGroup.getChildren())
		}

		if (chunks.length === 0) return source;
		return this.asString([
			source,
			"",
			"// on error function for async loading",
			this.requireFn + ".oe = function(err) { console.error(err); throw err; };"
		]);
	});
	compilation.hooks.bootstrap.tap("bootstrap", function (source, chunk, hash) {
		
		var chunks = []	
		for (const chunkGroup of chunk.groupsIterable) {
			chunks.concat(chunkGroup.getChildren())
		}

		if (chunks.length > 0) {
			var jsonpFunction = this.outputOptions.jsonpFunction;
			return this.asString([
				source,
				"",
				"// install a JSONP callback for chunk loading",
				"var parentJsonpFunction = global[" + JSON.stringify(jsonpFunction) + "];",
				"global[" + JSON.stringify(jsonpFunction) + "] = function webpackJsonpCallback(chunkIds, moreModules, executeModules) {",
				this.indent([
					"// add \"moreModules\" to the modules object,",
					"// then flag all \"chunkIds\" as loaded and fire callback",
					"var moduleId, chunkId, i = 0, resolves = [], result;",
					"for(;i < chunkIds.length; i++) {",
					this.indent([
						"chunkId = chunkIds[i];",
						"if(installedChunks[chunkId])",
						this.indent("resolves.push(installedChunks[chunkId][0]);"),
						"installedChunks[chunkId] = 0;"
					]),
					"}",
					"for(moduleId in moreModules) {",
					this.indent([
						"if(Object.prototype.hasOwnProperty.call(moreModules, moduleId)) {",
						this.indent(this.renderAddModule(hash, chunk, "moduleId", "moreModules[moduleId]")),
						"}"
					]),
					"}",
					"if(parentJsonpFunction) parentJsonpFunction(chunkIds, moreModules, executeModules);",
					"while(resolves.length)",
					this.indent("resolves.shift()();"),
					this.entryPointInChildren(chunk) ? [
						"if(executeModules) {",
						this.indent([
							"for(i=0; i < executeModules.length; i++) {",
							this.indent("result = " + this.requireFn + "(" + this.requireFn + ".s = executeModules[i]);"),
							"}"
						]),
						"}",
						"return result;",
					] : ""
				]),
				"};"
			]);
		}
		return source;
	});
	compilation.hooks.hotBootstrap.tap("hot-bootstrap", function (source, chunk, hash) {
		var hotUpdateChunkFilename = this.outputOptions.hotUpdateChunkFilename;
		var hotUpdateMainFilename = this.outputOptions.hotUpdateMainFilename;
		var hotUpdateFunction = this.outputOptions.hotUpdateFunction;
		var currentHotUpdateChunkFilename = this.applyPluginsWaterfall("asset-path", JSON.stringify(hotUpdateChunkFilename), {
			hash: "\" + " + this.renderCurrentHashCode(hash) + " + \"",
			hashWithLength: function (length) {
				return "\" + " + this.renderCurrentHashCode(hash, length) + " + \"";
			}.bind(this),
			chunk: {
				id: "\" + chunkId + \""
			}
		});
		var currentHotUpdateMainFilename = this.applyPluginsWaterfall("asset-path", JSON.stringify(hotUpdateMainFilename), {
			hash: "\" + " + this.renderCurrentHashCode(hash) + " + \"",
			hashWithLength: function (length) {
				return "\" + " + this.renderCurrentHashCode(hash, length) + " + \"";
			}.bind(this)
		});

		return source + "\n" +
			"function hotDisposeChunk(chunkId) {\n" +
			"\tdelete installedChunks[chunkId];\n" +
			"}\n" +
			"var parentHotUpdateCallback = this[" + JSON.stringify(hotUpdateFunction) + "];\n" +
			"this[" + JSON.stringify(hotUpdateFunction) + "] = " + Template.getFunctionContent(require("./JsonpMainTemplate.runtime.js"))
				.replace(/\/\/\$semicolon/g, ";")
				.replace(/\$require\$/g, this.requireFn)
				.replace(/\$hotMainFilename\$/g, currentHotUpdateMainFilename)
				.replace(/\$hotChunkFilename\$/g, currentHotUpdateChunkFilename)
				.replace(/\$hash\$/g, JSON.stringify(hash));
	});
	compilation.hooks.hash.tap("hash", function (hash) {
		hash.update("jsonp");
		hash.update("4");
		hash.update(compilation.outputOptions.filename + "");
		hash.update(compilation.outputOptions.chunkFilename + "");
		hash.update(compilation.outputOptions.jsonpFunction + "");
		hash.update(compilation.outputOptions.hotUpdateFunction + "");
	});
};

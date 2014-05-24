/**	Make multiple HTTP requests in order, firing the callback only when all have completed. <br />
 *	<strong>Callback Format:</strong> <br />
 *	<code>
 *		callback(
 *			success   // {Boolean} - did *any* requests succeed?
 *			responses // {Array}   - responses corresponding to the provided resources.
 *			successes // {Number}  - how many requests succeeded (status<400)
 *			failures  // {Number}  - how many requests failed (status>=400)
 *		);
 *	</code>
 *	@param {Array(Object)} resources		An array of resource objects, with format as described in {@link puredom.net.request} options.
 *	@param {Function} [callback]	A function to call once all requests have completed, with signature <code>function(success, responses, successes, failures)</code>. [See description]
 *	@returns {Boolean} returns false if no resources were provided.
 */
puredom.net.multiLoad = function(resources, callback) {
	if (!resources) {
		return false;
	}
	var cur = -1,
		max = resources.length,
		allData = [],
		trues = 0,
		falses = 0,
		loaded, loadNext;
	
	/** @inner */
	loaded = function(result, data) {
		if (result && data) {
			var res = resources[cur],
				d = data;
			if (res.process && res.process.call) {
				d = res.process(d);
				if (d===undefined) {
					d = data;
				}
			}
			allData.push(d);
			if (callback) {
				callback(trues>0, allData, trues, falses);
			}
			loaded = loadNext = resources = allData = callback = null;
		}
		else {
			loadNext();
		}
	};
	
	/** @inner */
	loadNext = function() {
		cur += 1;
		var res = resources[cur],
			d = typeof res==='string' ? {url:res} : res;
		if (d) {
			http.request(d, loaded);
		}
		else {
			if (cur<max) {
				loadNext();
			}
			else {
				callback(false, null, null, "No resources were available.");
			}
		}
	};
	
	loadNext();
	
	return true;
};
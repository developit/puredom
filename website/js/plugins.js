(function() {
	var base = puredom('#plugins'),
		tpl = puredom('.plugin.template').hide().declassify('template').remove(),
		repoUrl = 'https://github.com/{owner|escape}/{name|escape}',
		ownerUrl = 'https://github.com/{owner|escape}',
		itemClick = function(e){ window.open(puredom(this).attr('data-url')); return e.cancel(); };
	puredom.net.jsonp('https://api.github.com/legacy/repos/search/puredom', function(res) {
		var repos = puredom.delve(res, 'data.repositories') || [],
			plugins = base.query('>.plugin'),
			count = 0,
			i;
		puredom.forEach(repos, function(repo, ind) {
			var item;
			if (repo.type==='repo' && !repo['private'] && String(repo.name).toLowerCase()!=='puredom') {
				count++;
				item = plugins.index(ind);
				if (!item.exists()) {
					item = tpl.clone(true).insertInto(base).fadeIn('slow');
				}
				repo.ownerUrl = puredom.template(ownerUrl, repo);
				repo.libName = repo.name.replace(/^puredom[.-]/g, '');
				repo.url = repo.url || puredom.template(repoUrl, repo);
				item.template(repo)
					.attr('data-url', repo.url)
					.on('click', itemClick);
				item.query('a').on('click', function(e) {
					e.cancelBubble();
				});
			}
		});
		if (count<plugins.length) {
			plugins.index(repos.length, plugins.length-repos.length).destroy();
		}
	});
}());

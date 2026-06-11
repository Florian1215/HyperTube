-- Curated movie selection for the new featured endpoint
INSERT INTO movies (imdbid, tmdbid, title, year, poster_url, backdrop_url, note, genre, summary) VALUES
    ('tt0017136', '19', 'Metropolis', '1927',
     'https://image.tmdb.org/t/p/w500/kr9wXRN23zLuWJIelahas1mtnYj.jpg',
     'https://image.tmdb.org/t/p/w500/eeMoFKxjjiCi6iep2GEZtSAMYIr.jpg',
     8.087, ARRAY[18, 878],
     'In a futuristic city of stark inequality, the son of its all-powerful ruler falls in love with a working-class prophet, sparking a revolution that will reshape their divided world.'),
    ('tt27613895', '1297842', 'GOAT', '2026',
     'https://image.tmdb.org/t/p/w500/wfuqMlaExcoYiUEvKfVpUTt1v4u.jpg',
     'https://image.tmdb.org/t/p/w500/tq3h43fZy0H80vzf47MAY7R9Mxo.jpg',
     8.115, ARRAY[16, 35, 10751],
     'An animated family comedy following an extraordinary champion whose journey to greatness inspires everyone around them.'),
    ('tt33071426', '1325734', 'The Drama', '2026',
     'https://image.tmdb.org/t/p/w500/89Dw1ujPlIPRLddhzNuJM4F401D.jpg',
     'https://image.tmdb.org/t/p/w500/b8H1a89qmNxF8rqFGrG93Q9qn52.jpg',
     6.937, ARRAY[10749, 35, 18],
     'A heartfelt romantic comedy-drama that explores the messy complexities of love, ambition, and personal growth.'),
    ('tt12042730', '687163', 'Project Hail Mary', '2026',
     'https://image.tmdb.org/t/p/w500/yihdXomYb5kTeSivtFndMy5iDmf.jpg',
     'https://image.tmdb.org/t/p/w500/2I1OFQJ0L9T0dpU6FobKFWV2PxX.jpg',
     8.645, ARRAY[878, 12],
     'Waking alone on a spacecraft with no memory, astronaut Ryland Grace must piece together why he was sent on a desperate solo mission millions of miles from Earth — humanity''s last hope against extinction.'),
    ('tt10370710', '660120', 'The Worst Person in the World', '2021',
     'https://image.tmdb.org/t/p/w500/1NxGNQchGBTHXJ6RShLY1IlZqWn.jpg',
     'https://image.tmdb.org/t/p/w500/4oWU9FPOvjCE85DaHm4vo89Whpz.jpg',
     7.4, ARRAY[18, 10749, 35],
     'Over four years and twelve chapters, Julie navigates the messy realities of love, identity, and ambition in contemporary Oslo.'),
    ('tt2543164', '329865', 'Arrival', '2016',
     'https://image.tmdb.org/t/p/w500/x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg',
     'https://image.tmdb.org/t/p/w500/uKPbFF08QkRMvIAsgCh1soeyPhZ.jpg',
     7.627, ARRAY[18, 878, 9648],
     'When twelve alien spacecraft appear simultaneously around the world, a linguist is recruited by the military to decipher their language and determine whether they come in peace.')
ON CONFLICT (imdbid) DO NOTHING;

INSERT INTO featured_movies (imdbid) VALUES
    ('tt0017136'),
    ('tt27613895'),
    ('tt33071426'),
    ('tt12042730'),
    ('tt10370710'),
    ('tt2543164')
ON CONFLICT (imdbid) DO NOTHING;

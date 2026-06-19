-- Dev seed: users and comments for local development

INSERT INTO users (email, username, first_name, last_name, password_hash, profile_picture) VALUES
    ('dev@hypertube.local', 'dev_user', 'Dev', 'User', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NULL),
    ('alice@example.local', 'alice', 'Alice', 'Example', '', NULL),
    ('bob@example.local', 'bob', 'Bob', 'Example', '', NULL),
    ('charlie@example.local', 'charlie', 'Charlie', 'Example', '', NULL),
    ('diana@example.local', 'diana', 'Diana', 'Example', '', NULL);

INSERT INTO movies (imdbid, tmdbid, title, year, poster_url, backdrop_url, note, genre) VALUES
    ('tt1612774', '45649', 'Rubber', '2010',
     'https://image.tmdb.org/t/p/w500/mWgCORI5IC5vOvB2cDVQe0YNtXZ.jpg',
     'https://image.tmdb.org/t/p/w500/cqfaq9uczoHBBug74eORBH4Jcpe.jpg',
     5.9, ARRAY[35, 18, 14, 27, 9648])
ON CONFLICT (imdbid) DO NOTHING;

INSERT INTO direct_stream_movies (imdbid) VALUES
    ('tt1612774')
ON CONFLICT (imdbid) DO NOTHING;

INSERT INTO default_movies (imdbid, position) VALUES
    ('tt1612774', 0)
ON CONFLICT (imdbid) DO UPDATE SET position = 0;

INSERT INTO movies (imdbid, tmdbid, title, year, poster_url, backdrop_url, note, genre) VALUES
    ('tt0017136', '19', 'Metropolis', '1927',
     'https://image.tmdb.org/t/p/w500/kr9wXRN23zLuWJIelahas1mtnYj.jpg',
     'https://image.tmdb.org/t/p/w500/eeMoFKxjjiCi6iep2GEZtSAMYIr.jpg',
     8.087, ARRAY[18, 878]),
    ('tt27613895', '1297842', 'GOAT', '2026',
     'https://image.tmdb.org/t/p/w500/wfuqMlaExcoYiUEvKfVpUTt1v4u.jpg',
     'https://image.tmdb.org/t/p/w500/tq3h43fZy0H80vzf47MAY7R9Mxo.jpg',
     8.115, ARRAY[16, 35, 10751]),
    ('tt33071426', '1325734', 'The Drama', '2026',
     'https://image.tmdb.org/t/p/w500/89Dw1ujPlIPRLddhzNuJM4F401D.jpg',
     'https://image.tmdb.org/t/p/w500/b8H1a89qmNxF8rqFGrG93Q9qn52.jpg',
     6.937, ARRAY[10749, 35, 18]),
    ('tt12042730', '687163', 'Project Hail Mary', '2026',
     'https://image.tmdb.org/t/p/w500/yihdXomYb5kTeSivtFndMy5iDmf.jpg',
     'https://image.tmdb.org/t/p/w500/2I1OFQJ0L9T0dpU6FobKFWV2PxX.jpg',
     8.645, ARRAY[878, 12]),
    ('tt10370710', '660120', 'The Worst Person in the World', '2021',
     'https://image.tmdb.org/t/p/w500/1NxGNQchGBTHXJ6RShLY1IlZqWn.jpg',
     'https://image.tmdb.org/t/p/w500/4oWU9FPOvjCE85DaHm4vo89Whpz.jpg',
     7.4, ARRAY[18, 10749, 35]),
    ('tt2543164', '329865', 'Arrival', '2016',
     'https://image.tmdb.org/t/p/w500/x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg',
     'https://image.tmdb.org/t/p/w500/uKPbFF08QkRMvIAsgCh1soeyPhZ.jpg',
     7.627, ARRAY[18, 878, 9648])
ON CONFLICT (imdbid) DO NOTHING;

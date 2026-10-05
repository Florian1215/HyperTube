from unittest import TestCase

from torrents.parsing import EPISODE_MATCH, SEASON_PACK_MATCH, SERIE_PACK_MATCH, find_episode_file, match_episode, \
    parse_episode


class ParseEpisodeTests(TestCase):
    def test_parse(self):
        cases = {
            'Greys.Anatomy.S22E18.MULTI.1080p.WEB.H264-GRP': ((22, 22), (18, 18)),
            "Grey's Anatomy S01 E03 FRENCH 720p": ((1, 1), (3, 3)),
            'Show.S01E01E02.VOSTFR.1080p': ((1, 1), (1, 2)),
            'Show.S02E05-E08.MULTI.2160p': ((2, 2), (5, 8)),
            'Show 3x07 VFF 1080p': ((3, 3), (7, 7)),
            'Show Saison 2 Episode 4 FRENCH': ((2, 2), (4, 4)),
            'Show.S04.MULTI.1080p.x264': ((4, 4), None),
            'Show Saison 1 FRENCH 1920x1080': ((1, 1), None),
            'Show.S01-S05.MULTI.1080p': ((1, 5), None),
            'Show Saison 1 à 3 VFF': ((1, 3), None),
            'Show INTEGRALE S01 MULTI': (None, None),
            'Show Intégrale MULTI 1080p': (None, None),
            'Show MULTI 1080p x265': (None, None),
        }
        for title, (seasons, episodes) in cases.items():
            with self.subTest(title=title):
                self.assertEqual(parse_episode(title), {'seasons': seasons, 'episodes': episodes})

    def test_match(self):
        cases = [
            ('Show.S02E05.MULTI.1080p', 2, 5, EPISODE_MATCH),
            ('Show.S02E05.MULTI.1080p', 2, 6, None),
            ('Show.S02E05.MULTI.1080p', 3, 5, None),
            ('Show.S02E05-E08.MULTI.1080p', 2, 6, SEASON_PACK_MATCH),
            ('Show.S02.MULTI.1080p', 2, 6, SEASON_PACK_MATCH),
            ('Show.S02.MULTI.1080p', 1, 6, None),
            ('Show.S01-S05.MULTI.1080p', 4, 2, SERIE_PACK_MATCH),
            ('Show.S01-S05.MULTI.1080p', 6, 2, None),
            ('Show Intégrale MULTI', 9, 9, SERIE_PACK_MATCH),
        ]
        for title, season, episode, expected in cases:
            with self.subTest(title=title, season=season, episode=episode):
                self.assertEqual(match_episode(title, season, episode), expected)

    def test_find_episode_file(self):
        paths = [
            'Show.S02.MULTI/Show.S02E01.MULTI.mkv',
            'Show.S02.MULTI/Show.S02E02.MULTI.mkv',
            'Show.S02.MULTI/Show.S02E10.MULTI.mkv',
        ]
        self.assertEqual(find_episode_file(paths, 2, 2), 1)
        self.assertEqual(find_episode_file(paths, 2, 10), 2)
        self.assertIsNone(find_episode_file(paths, 2, 3))
        self.assertIsNone(find_episode_file(paths, 1, 2))

        paths = ['Show/Season 1/Episode 02.mkv', 'Show/Season 2/Episode 01.mkv', 'Show/Season 2/Episode 02.mkv']
        self.assertEqual(find_episode_file(paths, 2, 2), 2)
        self.assertEqual(find_episode_file(paths, 1, 2), 0)
        self.assertIsNone(find_episode_file(paths, 3, 1))

        self.assertEqual(find_episode_file(['Show/E01.mkv', 'Show/E02.mkv'], 1, 2), 1)
        self.assertIsNone(find_episode_file(['Show/sample.mkv'], 1, 1))

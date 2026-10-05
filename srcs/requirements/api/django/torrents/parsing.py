import re

SEASON_RANGE = re.compile(
    r'\b(?:S|Saisons?\s*|Seasons?\s*)(\d{1,2})\s*(?:-|à|a|to|au)\s*(?:S|Saisons?\s*|Seasons?\s*)?(\d{1,2})\b',
    re.IGNORECASE
)
COMPLETE = re.compile(r'int[eé]grale|complete\s+series|s[eé]rie\s+compl[eè]te', re.IGNORECASE)
SEASON_EPISODE = re.compile(r'\bS(\d{1,2})[\s._-]*E(\d{1,3})((?:[\s._-]*(?:E|-)\d{1,3})*)', re.IGNORECASE)
SEASON_X_EPISODE = re.compile(r'\b(\d{1,2})x(\d{2,3})\b', re.IGNORECASE)
LONG_SEASON_EPISODE = re.compile(
    r'\b(?:Saison|Season)\s*(\d{1,2})\D{0,3}(?:[EÉ]pisode|Ep)\s*(\d{1,3})\b',
    re.IGNORECASE
)
SEASON = re.compile(r'\b(?:S|Saison\s*|Season\s*)(\d{1,2})\b', re.IGNORECASE)
EPISODE = re.compile(r'\b(?:E|Ep|[EÉ]pisode)[\s._-]*(\d{1,3})\b', re.IGNORECASE)

# how well a torrent matches an episode, best first
EPISODE_MATCH, SEASON_PACK_MATCH, SERIE_PACK_MATCH = range(3)


def parse_episode(title):
    """
    Read the seasons and episodes a torrent title (or a file path) covers.
    Returns {'seasons': (first, last) | None, 'episodes': (first, last) | None}:
    no episodes means a whole season, no seasons means the title does not say (complete series).
    """
    title = title.replace('_', ' ')
    match = SEASON_EPISODE.search(title)
    if match:
        season, first = int(match.group(1)), int(match.group(2))
        others = [int(n) for n in re.findall(r'\d+', match.group(3))]
        last = max([first] + [n for n in others if n > first])
        return {'seasons': (season, season), 'episodes': (first, last)}
    match = LONG_SEASON_EPISODE.search(title) or SEASON_X_EPISODE.search(title)
    if match:
        season, episode = int(match.group(1)), int(match.group(2))
        return {'seasons': (season, season), 'episodes': (episode, episode)}
    match = SEASON_RANGE.search(title)
    if match:
        first, last = sorted((int(match.group(1)), int(match.group(2))))
        return {'seasons': (first, last), 'episodes': None}
    if COMPLETE.search(title):
        return {'seasons': None, 'episodes': None}
    match = SEASON.search(title)
    if match:
        season = int(match.group(1))
        episode = EPISODE.search(title)
        if episode:
            return {'seasons': (season, season), 'episodes': (int(episode.group(1)),) * 2}
        return {'seasons': (season, season), 'episodes': None}
    return {'seasons': None, 'episodes': None}


def match_episode(title, season_number, episode_number):
    """
    Tell how a torrent title matches an episode: EPISODE_MATCH, SEASON_PACK_MATCH, SERIE_PACK_MATCH,
    or None when the torrent does not contain the episode.
    """
    info = parse_episode(title)
    if info['seasons'] is None:
        return SERIE_PACK_MATCH
    first, last = info['seasons']
    if not first <= season_number <= last:
        return None
    if first != last:
        return SERIE_PACK_MATCH
    if info['episodes'] is None:
        return SEASON_PACK_MATCH
    first, last = info['episodes']
    if not first <= episode_number <= last:
        return None
    return EPISODE_MATCH if first == last else SEASON_PACK_MATCH


def find_episode_file(paths, season_number, episode_number):
    """
    Find, among the file paths of a torrent, the one holding an episode.
    The season is read from the file name, then from its folders (e.g. 'Season 2/E03.mkv').
    Returns its index in paths, or None.
    """
    for index, path in enumerate(paths):
        parts = path.replace('\\', '/').split('/')
        info = parse_episode(parts[-1])
        if info['episodes'] is None:
            episode = EPISODE.search(parts[-1].replace('_', ' '))
            if not episode:
                continue
            info['episodes'] = (int(episode.group(1)),) * 2
        if info['seasons'] is None:
            for folder in reversed(parts[:-1]):
                info['seasons'] = parse_episode(folder)['seasons']
                if info['seasons']:
                    break
        seasons = info['seasons'] or (season_number, season_number)
        if seasons[0] <= season_number <= seasons[1] and info['episodes'][0] <= episode_number <= info['episodes'][1]:
            return index
    return None

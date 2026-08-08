import requests
import xmltodict
from future.backports.datetime import datetime

# from django.conf import settings
C411_BASE_URL = 'https://c411.org/api'
C411_API_KEY = '9b540608e6b8e0ee7fdb03f6b22a38563d8af78ec9b345f7a16c2420abe3dbb8'


class MovieTorrent:
    def __init__(self, obj):
        self.id: str = obj.get('guid')
        self.title: str = obj.get('title')
        self.link: str = obj.get('link')
        self.pubDate: str = datetime.strptime(obj.get('pubDate'), "%a, %d %b %Y %H:%M:%S %z")
        self.size: int = int(obj.get('size'))
        self.url: str = obj['enclosure'].get('@url')

        torznab_dic = {}
        for i in obj['torznab:attr']:
            torznab_dic[i.get('@name')] = i.get('@value')
        self.category: str = str(torznab_dic['category'])
        self.seeders: int = int(torznab_dic['seeders'])
        self.peers: int = int(torznab_dic['peers'])
        self.tmdbid: str = torznab_dic['tmdbid']

    def __str__(self):
        return f"{self.title} - {self.id}"


class C411Client:
    @staticmethod
    def search_movies(title=None):
        url = f'{C411_BASE_URL}/torznab?'
        params = {
            't': 'movie',
            'apikey': C411_API_KEY,
            'cat': '2000',
        }
        if title is None:
            params['limit'] = '100'
            params['q'] = ''
        else:
            params['q'] = title
        response = requests.get(url, params=params, headers={'Accept': 'application/json'})
        response.raise_for_status()
        data = xmltodict.parse(response.text)
        res = []
        for i in data['rss']['channel']['item']:
            res.append(MovieTorrent(i))
        return res


c411_client = C411Client()
c411_client.search_movies("backroom")

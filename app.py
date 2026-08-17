import json
from pathlib import Path

from flask import Flask, request, render_template, abort

app = Flask(__name__)

DATA_DIR = Path(app.root_path) / 'static' / 'data'


def _load_dir(directory):
    items = {}
    for path in sorted(directory.glob('*.json')):
        data = json.loads(path.read_text(encoding='utf-8'))
        assert data['slug'] == path.stem, f"slug/filename mismatch: {path}"
        items[data['slug']] = data
    return items


def _load_one(directory, slug):
    path = directory / f'{slug}.json'
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding='utf-8'))


def _resolve_etg(query_value, default):
    return query_value if query_value in ('yes', 'no') else default


def _has_deck_variant(side_bet):
    variant_filter = side_bet.get('variant_filter')
    return bool(variant_filter) and variant_filter.get('kind') == 'decks'


@app.route('/')
def index():
    main_games = _load_dir(DATA_DIR / 'main_games')
    side_bets = _load_dir(DATA_DIR / 'side_bets')

    def by_etg(items, allowed):
        return [v for v in items.values() if v['etg'] in allowed]

    return render_template('index.html',
        main_games=by_etg(main_games, ('no', 'both')),
        side_bets=by_etg(side_bets, ('no', 'both')),
        etg_main_games=by_etg(main_games, ('yes', 'both')),
        etg_side_bets=by_etg(side_bets, ('yes', 'both')))


@app.route('/game/<game_name>')
def game_page(game_name):
    game = _load_one(DATA_DIR / 'main_games', game_name)
    if not game:
        abort(404)

    etg = _resolve_etg(request.args.get('etg'), game['etg'])
    side_bets = _load_dir(DATA_DIR / 'side_bets')
    relevant_side_bets = [sb for sb in side_bets.values() if game_name in sb['games']]
    show_decks_column = any(_has_deck_variant(sb) for sb in relevant_side_bets)

    return render_template('main_games/game.html',
        game=game, etg=etg, side_bets=relevant_side_bets, show_decks_column=show_decks_column)


@app.route('/side_bet/<side_bet_name>')
def side_bet_page(side_bet_name):
    side_bet = _load_one(DATA_DIR / 'side_bets', side_bet_name)
    if not side_bet:
        abort(404)

    etg = _resolve_etg(request.args.get('etg'), side_bet['etg'])
    return render_template('side_bets/side_bet.html', side_bet=side_bet, etg=etg)


if __name__ == '__main__':
    app.run(debug=True)

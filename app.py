from flask import Flask, request, render_template, abort
from dataclasses import dataclass, field
from typing import List

@dataclass
class Game:
    name: str
    file_path:str
    etg: str = 'no'

@dataclass
class SideBet:
    name: str
    file_path:str
    games: List[str]
    etg: str = 'no'

app = Flask(__name__)

main_games = [
    Game(name='Blackjack', file_path='blackjack.html', etg='both'),
    Game(name='Blackjack Challenge', file_path='blackjack_challenge.html'),
    Game(name='Baccarat', file_path='baccarat.html'),
    Game(name='Caribbean Stud Poker', file_path='caribbean_stud.html'),
    Game(name='Electronic Sic-Bo', file_path='electronic_sic-bo.html', etg='yes'),
    Game(name='Mississippi Stud Poker', file_path='mississippi_stud.html'),
    Game(name='Roulette', file_path='roulette.html', etg='both'),
    Game(name='Sic-Bo', file_path='sic-bo.html'),
    Game(name='Soft 17 Blackjack', file_path='soft_17_blackjack.html'),
    Game(name='Spanish Blackjack', file_path='spanish_blackjack.html'),
    Game(name='Texas Hold\'em Bonus Poker', file_path='texas_holdem_bonus.html'),
    Game(name='Three Card Poker', file_path='three_card_poker.html', etg='both'),
    Game(name='Ultimate Texas Hold\'em Poker', file_path='ultimate_texas_holdem.html'),
    Game(name='Wheel of Fortune', file_path='wheel_of_fortune.html'),
    Game(name='Craps', file_path='craps.html'),
    Game(name='Lucky Draw Baccarat', file_path='lucky_draw_baccarat.html'),
    Game(name='Blackjack Switch', file_path='blackjack_switch.html'),
    Game(name='Casino War', file_path='casino_war.html'),
    Game(name='RouletteX', file_path='roulettex.html', etg='yes'),
]

side_bets = [
    SideBet(name='Perfect Pairs', file_path='sb_perfect_pairs.html', games=['baccarat', 'blackjack', 'blackjack_challenge', 'soft_17_blackjack'], etg='both'),
    SideBet(name='Lucky Lucky', file_path='sb_lucky_lucky.html', games=['blackjack', 'blackjack_challenge', 'soft_17_blackjack']),
    SideBet(name='Dragon Bonus', file_path='sb_dragon_bonus.html', games=['baccarat']),
    SideBet(name='Tiger Baccarat', file_path='sb_tiger_baccarat.html', games=['baccarat']),
    SideBet(name='Perfect Pairs - Spanish', file_path='sb_perfect_pairs_spanish.html', games=['spanish_blackjack']),
    SideBet(name='Table Jackpot System', file_path='sb_table_jackpot.html', games=['mississippi_stud', 'caribbean_stud', 'texas_holdem_bonus', 'ultimate_texas_holdem', 'three_card_poker']),
    SideBet(name='Player Pair or Banker Pair', file_path='sb_player_banker_pair.html', games=['baccarat']),
    SideBet(name='Super 6', file_path='sb_super_six.html', games=['baccarat']),
    SideBet(name='Super Sevens', file_path='sb_super_sevens.html', games=['blackjack']),
    SideBet(name='3 Card Bonus', file_path='sb_three_card_bonus.html', games='mississippi_stud'),
    SideBet(name='Star Pairs', file_path='sb_star_pairs.html', games=['blackjack', 'blackjack_challenge', 'soft_17_blackjack', 'blackjack_switch']),
    SideBet(name='Super Match', file_path='sb_super_match.html', games=['blackjack_switch']),
    SideBet(name='Tie Wager (Casino War)', file_path='sb_tie_wager.html', games=['casino_war']),
]



@app.route('/')
def index():
    filtered_main_games = [game for game in main_games if game.etg in ['no', 'both']]
    filtered_side_bets = [bet for bet in side_bets if bet.etg in ['no', 'both']]
    etg_main_games = [game for game in main_games if game.etg in ['yes', 'both']]
    etg_side_bets = [bet for bet in side_bets if bet.etg in ['yes', 'both']]
    
    return render_template('index.html', 
                        main_games=filtered_main_games, 
                        side_bets=filtered_side_bets, 
                        etg_main_games=etg_main_games, 
                        etg_side_bets=etg_side_bets)


@app.route('/game/<game_name>')
def game_page(game_name):
    game = next((game for game in main_games if game.file_path.replace('.html', '') == game_name), None)
    relevant_side_bets = [bet for bet in side_bets if game_name in bet.games]

    if game:
        # Get the etg flag from the query parameters
        etg_flag = request.args.get('etg', None)  # Get the 'etg' value from the URL (e.g., ?etg=yes or ?etg=no)

        # Override 'both' if necessary
        if etg_flag in ['yes', 'no']:
            etg = etg_flag  # Use the value from the URL
        else:
            etg = game.etg  # Default to the game's original 'etg' value
        return render_template(f'main_games/{game.file_path}', side_bets=relevant_side_bets, etg=etg)
    else:
        abort(404)  

@app.route('/side_bets/<side_bet_name>')
def side_bet_page(side_bet_name):
    side_bet_file = next((side_bet.file_path for side_bet in side_bets if side_bet.file_path.replace('.html', '') == side_bet_name), None)

    if side_bet_file:
        return render_template(f'side_bets/{side_bet_file}')
    else:
        abort(404)   

if __name__ == '__main__':
    app.run(debug=True)


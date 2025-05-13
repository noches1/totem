import random
import enum
from dev import IS_DEV

if IS_DEV:
    print("rgbmatrix not found, Importing RGBMatrixEmulator")
    from RGBMatrixEmulator import graphics
else:
    from rgbmatrix import graphics  # type: ignore


WHITE = graphics.Color(255, 255, 255)
WHITE_50 = graphics.Color(128, 128, 128)

colours = {
    "s": graphics.Color(255, 255, 255),
    "h": graphics.Color(255, 0, 0),
    "c": graphics.Color(0, 255, 0),
    "d": graphics.Color(155, 155, 255),
}

suits = {"c": "♣︎", "d": "♦︎", "h": "♥︎", "s": "♠︎"}


FPS = round(1 / 0.015)

# Questions have two states
SECONDS_PER_QUESTION_STATE = 5
FRAMES_PER_QUESTION_STATE = FPS * SECONDS_PER_QUESTION_STATE
FRAMES_PER_QUESTION = 2 * FRAMES_PER_QUESTION_STATE

ANSWER_OPEN = "Open"
ANSWER_FOLD = "Fold"


def make_questions(position, answer, hole_cards):
    return [
        {"hero_position": position, "correct_action": answer, "cards": hand}
        for hand in hole_cards
    ]


sb_folds = ["9h5h", "Js3s", "9c7d", "Kh7s", "7d4d"]
sb_opens = ["Qs2s", "6c4c", "Qs9c", "Ah4d", "Th6h"]
utg_folds = ["Qd7d", "Kh4h", "JcTd", "Ts8s", "2c2h"]
utg_opens = ["Qh8h", "Ks5s", "Ad2d", "AsTh", "6s6d"]
bu_folds = ["Js3s", "9h5h", "Qc8d", "Ks6h", "4h3h", "As2h"]
bu_opens = ["As4s", "9h6h", "Ks2s", "6h5h", "Td8s"]
questions = [
    *make_questions("SB", ANSWER_FOLD, sb_folds),
    *make_questions("SB", ANSWER_OPEN, sb_opens),
    *make_questions("UTG", ANSWER_OPEN, utg_opens),
    *make_questions("UTG", ANSWER_FOLD, utg_folds),
    *make_questions("BTN", ANSWER_OPEN, bu_opens),
    *make_questions("BTN", ANSWER_FOLD, bu_folds),
]


class QuestionState(enum.IntEnum):
    QUESTION = 0
    ANSWER = 1


class PokerscopeQuiz:
    def __init__(self, questions, renderer):
        self.all_questions = questions
        self.frame = 0
        self.renderer = renderer

    # Returns True if new question is about to start
    def tick(self):
        last_question = self.question
        self.frame += 1
        if self.frame >= len(self.all_questions) * FRAMES_PER_QUESTION:
            self.frame = 0
        return last_question is not self.question

    @property
    def state(self):
        return (self.frame // FRAMES_PER_QUESTION_STATE) % len(QuestionState)

    @property
    def question(self):
        index = (self.frame // FRAMES_PER_QUESTION) % len(self.all_questions)
        return self.all_questions[index]

    def render(self):
        question = self.question

        cards = question["cards"]
        hero = question["hero_position"]
        correct_action = question["correct_action"]

        padding_x = 4
        start_x, start_y = padding_x, 20
        x = start_x
        y = start_y

        hero_width = self.renderer.calculate_text_width(hero, "sm")
        canvas_width = 64 if IS_DEV else self.renderer.canvas.width
        _, question_height = self.renderer.render_text(
            hero, (canvas_width - hero_width) // 2, y, WHITE, "sm"
        )
        y += question_height + 6

        cards_width = self.renderer.render_hole_cards(cards, x, y)
        offset_y = 0
        for i, action in enumerate([ANSWER_FOLD, ANSWER_OPEN]):
            colour = WHITE
            if self.state == QuestionState.ANSWER:
                if action == correct_action:
                    colour = colours["c"]
                else:
                    colour = WHITE_50
            _, offset_y = self.renderer.render_text(
                action, x + cards_width + 8, y + i * offset_y, colour, "sm"
            )


class PokerscopeRenderer:
    def __init__(self, canvas, font_dir):
        self.canvas = canvas
        self.rank_font = graphics.Font()
        self.rank_font.LoadFont(f"{font_dir}/8x13B.bdf")
        self.suit_font = graphics.Font()
        self.suit_font.LoadFont(f"{font_dir}/10x20.bdf")
        self.text_fonts = {
            "sm": graphics.Font(),
            "md": graphics.Font(),
            "lg": graphics.Font(),
        }
        self.text_fonts["sm"].LoadFont(f"{font_dir}/6x13B.bdf")
        self.text_fonts["md"].LoadFont(f"{font_dir}/7x13B.bdf")
        self.text_fonts["lg"].LoadFont(f"{font_dir}/8x13B.bdf")

    def set_canvas(self, canvas):
        self.canvas = canvas

    def calculate_text_width(self, text, size="md"):
        font = self.text_fonts.get(size, self.text_fonts["md"])
        width = 0
        for c in text:
            width += font.CharacterWidth(ord(c))
        return width

    def render_frame(self):
        if not IS_DEV:
            return
        graphics.DrawLine(self.canvas, 64, 0, 64, self.canvas.height, WHITE)

    def render_text(self, text, x, y, colour, size="md"):
        font = self.text_fonts.get(size, self.text_fonts["md"])
        graphics.DrawText(self.canvas, font, x, y, colour, text)
        width = graphics.DrawText(
            self.canvas, font, x, y + self.canvas.height // 2, colour, text
        )
        return (width, font.height)

    def render_hole_cards(self, cards, x, y):
        padding = 2
        card1 = cards[:2]
        card2 = cards[2:]
        width1, _ = self.render_card(card1, x, y)
        width2, _ = self.render_card(card2, x + width1 + padding, y)
        return width1 + width2 + padding

    def render_card(self, card, x, y):
        rank, suit = card

        rank_width = self.rank_font.CharacterWidth(ord(rank))
        suit_width = self.suit_font.CharacterWidth(ord(suit))

        rank_padding, suit_padding = 0, 0
        if rank_width < suit_width:
            rank_padding = (suit_width - rank_width + 1) // 2
        elif suit_width < rank_width:
            suit_padding = (rank_width - suit_width + 1) // 2

        width = max(rank_width, suit_width)
        height = self.rank_font.height + self.suit_font.height

        graphics.DrawText(
            self.canvas, self.rank_font, x + rank_padding, y, colours[suit], rank
        )
        graphics.DrawText(
            self.canvas,
            self.rank_font,
            x + rank_padding,
            y + self.canvas.height // 2,
            colours[suit],
            rank,
        )
        graphics.DrawText(
            self.canvas,
            self.suit_font,
            x + suit_padding,
            y + self.rank_font.height,
            colours[suit],
            suits[suit],
        )
        graphics.DrawText(
            self.canvas,
            self.suit_font,
            x + suit_padding,
            y + self.rank_font.height + self.canvas.height // 2,
            colours[suit],
            suits[suit],
        )

        return (width, height)


class PokerscopeAd:
    def __init__(self, renderer, x, y):
        self.renderer = renderer
        self.initial_ad_position = (x, y)
        self.ad_position = (x, y)

    def reset(self):
        self.ad_position = self.initial_ad_position

    def render(self):
        ad_width, ad_height = 0, 0
        ad_colours = ["s", "h", "d", "c"]
        for i, colour in enumerate(ad_colours):
            ad_width, ad_height = self.render_ad(
                self.ad_position[0],
                self.ad_position[1] + i * ad_height,
                colours[colour],
            )

        self.ad_position = (self.ad_position[0] - 1, self.ad_position[1])
        if self.ad_position[0] + ad_width < 0:
            self.ad_position = (
                64 if IS_DEV else self.renderer.canvas.width,
                self.ad_position[1],
            )

    def render_ad(self, x, y, colour):
        return self.renderer.render_text("get.pokerscope.app", x, y, colour)


class PokerscopeState(enum.IntEnum):
    QUIZ = 0
    AD = 1


SECONDS_TO_SHOW_AD = 5
NUM_AD_FRAMES = round(FPS * SECONDS_TO_SHOW_AD)


class Pokerscope:
    def __init__(self, font_dir, canvas):
        shuffled_questions = questions[:]
        random.shuffle(shuffled_questions)
        self.renderer = PokerscopeRenderer(canvas, font_dir)
        self.quiz = PokerscopeQuiz(shuffled_questions, self.renderer)
        self.ad = PokerscopeAd(self.renderer, (64 if IS_DEV else canvas.width) - 1, 16)
        self.questions_shown = 0
        self.state = "quiz"
        self.ad_frames = 0

    def tick(self, canvas):
        self.renderer.set_canvas(canvas)

        if self.state == "quiz":
            has_new_question = self.quiz.tick()
            if has_new_question:
                self.questions_shown += 1

            if self.questions_shown >= 3:
                self.state = "ad"
                self.ad.reset()
                self.ad_frames = 0
                self.questions_shown = 0
            else:
                self.quiz.render()
        elif self.state == "ad":
            self.ad_frames += 1
            self.ad.render()
            if self.ad_frames > NUM_AD_FRAMES:
                self.state = "quiz"

        self.renderer.render_frame()

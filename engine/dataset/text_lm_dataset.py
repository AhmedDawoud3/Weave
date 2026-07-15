"""
text_lm_dataset.py — Character-level sliding-window language model dataset.
============================================================================
Supports:
  - Built-in texts: "names" (Andrej Karpathy makemore), "tiny_shakespeare"
  - Uploaded files (server-side path)
  - Pasted plain text (inline string)

Returns (input_ids: LongTensor[T], target_ids: LongTensor[T]) pairs where
target_ids is input_ids shifted by 1 (next-token prediction).
"""

from __future__ import annotations

import os
from typing import Any

import torch
from torch.utils.data import Dataset


# Inline built-in texts (tiny versions suitable for quick experiments)
_BUILTIN_NAMES = """\
emma
olivia
ava
isabella
sophia
charlotte
mia
amelia
harper
evelyn
abigail
emily
elizabeth
mila
ella
avery
sofia
camila
aria
scarlett
victoria
madison
luna
grace
chloe
penelope
layla
riley
zoey
nora
lily
eleanor
hannah
lillian
addison
aubrey
ellie
stella
natalie
zoe
leah
hazel
violet
aurora
savannah
audrey
brooklyn
bella
claire
skylar
lucy
paisley
everly
anna
caroline
genesis
aaliyah
kennedy
kinsley
allison
maya
sarah
alyssa
anna
alexis
aria
ariana
arya
ashley
avery
bailey
chloe
claire
destiny
eleanor
elena
elise
elizabeth
ella
ellie
emily
emma
evelyn
gabriella
grace
hailey
hannah
isabella
jenna
jessica
julia
katherine
kaylee
kennedy
khloe
layla
leah
lena
lila
lily
lola
lucy
luna
lydia
madison
maya
mia
mila
molly
morgan
naomi
natalia
natalie
nora
olivia
paige
peyton
piper
quinn
rachel
reagan
riley
ruby
samantha
sara
sarah
savannah
scarlett
serenity
skylar
sofia
sophia
stella
summer
sydney
taylor
trinity
valentina
vanessa
victoria
violet
willow
xena
zoe
zoey
james
william
oliver
benjamin
elijah
lucas
mason
logan
alexander
ethan
jacob
michael
daniel
henry
jackson
sebastian
aiden
matthew
samuel
david
joseph
carter
owen
wyatt
john
jack
luke
jayden
dylan
grayson
levi
isaac
gabriel
julian
mateo
anthony
jaxon
lincoln
joshua
christopher
andrew
theodore
caleb
ryan
asher
nathan
thomas
leo
isaiah
charles
josiah
hudson
christian
hunter
connor
eli
ezra
aaron
landon
adrian
jonathan
nolan
jeremiah
ezekiel
angel
roman
declan
damien
bentley
evan
kayden
zachary
colton
vincent
liam
brayden
tristan
blake
ryder
sawyer
amir
cole
cameron
carlos
austin
chase
dominic
elias
rowan
jaxson
micah
bryson
axel
maverick
easton
emmett
tyler
silas
weston
miles
judah
phoenix
maddox
""".strip()

_BUILTIN_TINY_SHAKESPEARE = """\
JULIET:
O Romeo, Romeo! wherefore art thou Romeo?
Deny thy father and refuse thy name;
Or, if thou wilt not, be but sworn my love,
And I'll no longer be a Capulet.

ROMEO:
[Aside] Shall I hear more, or shall I speak at this?

JULIET:
'Tis but thy name that is my enemy;
Thou art thyself, though not a Montague.
What's Montague? it is nor hand, nor foot,
Nor arm, nor face, nor any other part
Belonging to a man. O, be some other name!
What's in a name? that which we call a rose
By any other name would smell as sweet;
So Romeo would, were he not Romeo call'd,
Retain that dear perfection which he owes
Without that title. Romeo, doff thy name,
And for that name which is no part of thee
Take all myself.

ROMEO:
I take thee at thy word:
Call me but love, and I'll be new baptized;
Henceforth I never will be Romeo.

JULIET:
What man art thou that thus bescreen'd in night
So stumblest on my counsel?

ROMEO:
By a name
I know not how to tell thee who I am:
My name, dear saint, is hateful to myself,
Because it is an enemy to thee;
Had I it written, I would tear the word.

JULIET:
My ears have not yet drunk a hundred words
Of that tongue's utterance, yet I know the sound:
Art thou not Romeo and a Montague?

ROMEO:
Neither, fair saint, if either thee dislike.
""".strip()


class CharLMDataset(Dataset):  # type: ignore[type-arg]
    """
    Sliding-window language model dataset supporting character-level and BPE tokenization.

    Each sample is (input_ids, target_ids) where:
      input_ids  = [c_0, c_1, ..., c_{T-1}]   LongTensor[context_length]
      target_ids = [c_1, c_2, ..., c_T    ]   LongTensor[context_length]

    The model predicts the next token at every position.
    """

    def __init__(
        self,
        text_source: str = "builtin",
        builtin_name: str | None = "tiny_shakespeare",
        file_path: str | None = None,
        text_content: str | None = None,
        context_length: int = 8,
        split: str = "train",
        train_split: float = 0.9,
        tokenization: str = "char",
        bpe_vocab_size: int = 256,
    ) -> None:
        text = self._load_text(text_source, builtin_name, file_path, text_content)
        self.tokenization = tokenization
        self.bpe_vocab_size = bpe_vocab_size

        if tokenization == "bpe":
            import hashlib
            from tokenizer import BPETokenizer, load_tokenizer, train_bpe, save_tokenizer

            # Cache key based on text and vocab size
            text_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()
            cache_dir = "../data/tokenizers"
            cache_path = os.path.join(cache_dir, f"cache_{text_hash}_{bpe_vocab_size}.json")

            if os.path.exists(cache_path):
                self.tokenizer_obj = load_tokenizer(cache_path)
            else:
                merges, vocab, special_tokens, frequencies = train_bpe(text, vocab_size=bpe_vocab_size)
                self.tokenizer_obj = BPETokenizer(merges=merges, vocab=vocab, special_tokens=special_tokens)
                self.tokenizer_obj.frequencies = frequencies
                os.makedirs(cache_dir, exist_ok=True)
                save_tokenizer(self.tokenizer_obj, cache_path)

            self.vocab_size = len(self.tokenizer_obj.vocab)
            # Encode entire corpus
            encoded = self.tokenizer_obj.encode(text)
            data = torch.tensor(encoded, dtype=torch.long)
        else:
            self.tokenizer_obj = None
            # Build vocabulary
            chars = sorted(set(text))
            self.vocab_size = len(chars)
            self.stoi = {c: i for i, c in enumerate(chars)}
            self.itos = {i: c for i, c in enumerate(chars)}
            # Encode entire corpus
            data = torch.tensor([self.stoi[c] for c in text], dtype=torch.long)

        # Split train / val
        n = int(train_split * len(data))
        self.data = data[:n] if split == "train" else data[n:]
        self.context_length = context_length

    # ------------------------------------------------------------------

    def _load_text(
        self,
        text_source: str,
        builtin_name: str | None,
        file_path: str | None,
        text_content: str | None,
    ) -> str:
        if text_source == "builtin":
            name = (builtin_name or "").lower()
            if name in ("names", "names.txt"):
                return _BUILTIN_NAMES
            elif name in ("tiny_shakespeare", "shakespeare"):
                return _BUILTIN_TINY_SHAKESPEARE
            else:
                raise ValueError(f"Unknown built-in text dataset: {builtin_name!r}. Choose 'names' or 'tiny_shakespeare'.")
        elif text_source == "upload":
            if not file_path:
                raise ValueError("file_path is required for text_source='upload'.")
            with open(file_path, encoding="utf-8") as f:
                return f.read()
        elif text_source == "paste":
            if not text_content:
                raise ValueError("text_content is required for text_source='paste'.")
            return text_content
        else:
            raise ValueError(f"Unknown text_source: {text_source!r}")

    # ------------------------------------------------------------------

    def __len__(self) -> int:
        return max(0, len(self.data) - self.context_length)

    def __getitem__(self, idx: int) -> tuple[torch.Tensor, torch.Tensor]:
        chunk = self.data[idx : idx + self.context_length + 1]
        x = chunk[:-1]
        y = chunk[1:]
        return x, y

    # ------------------------------------------------------------------
    # Convenience helpers used by dataset_factory / shape inference
    # ------------------------------------------------------------------

    def get_vocab_info(self) -> dict[str, Any]:
        return {
            "vocab_size": self.vocab_size,
            "context_length": self.context_length,
            "dataset_size": len(self),
        }

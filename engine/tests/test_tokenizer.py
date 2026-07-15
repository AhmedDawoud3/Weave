import os
import tempfile
from tokenizer import BPETokenizer, train_bpe, save_tokenizer, load_tokenizer

def test_tokenizer_train_encode_decode():
    text = "hello world! hello universe! this is a simple text to train bpe."
    
    # Train BPE with a small vocab size
    merges, vocab, special_tokens, frequencies = train_bpe(text, vocab_size=300, special_tokens=["<|endoftext|>"])
    
    # Check base bytes are present
    assert len(vocab) >= 256
    assert "<|endoftext|>" in special_tokens
    assert len(frequencies) > 0
    
    tokenizer = BPETokenizer(merges=merges, vocab=vocab, special_tokens=special_tokens)
    tokenizer.frequencies = frequencies
    
    # Encode and decode normal text
    test_str = "hello world! bpe training works."
    ids = tokenizer.encode(test_str)
    decoded = tokenizer.decode(ids)
    
    assert decoded == test_str
    
    # Encode and decode with special tokens
    test_special = "hello <|endoftext|> world"
    ids_special = tokenizer.encode(test_special)
    assert special_tokens["<|endoftext|>"] in ids_special
    decoded_special = tokenizer.decode(ids_special)
    assert decoded_special == test_special

def test_tokenizer_serialization():
    text = "hello world! hello universe! this is a simple text to train bpe."
    merges, vocab, special_tokens, frequencies = train_bpe(text, vocab_size=300, special_tokens=["<|endoftext|>"])
    tokenizer = BPETokenizer(merges=merges, vocab=vocab, special_tokens=special_tokens)
    tokenizer.frequencies = frequencies
    
    with tempfile.TemporaryDirectory() as tmpdir:
        filepath = os.path.join(tmpdir, "tokenizer.json")
        save_tokenizer(tokenizer, filepath)
        
        # Load it back
        loaded = load_tokenizer(filepath)
        
        test_str = "hello <|endoftext|> world!"
        assert loaded.encode(test_str) == tokenizer.encode(test_str)
        assert loaded.decode(loaded.encode(test_str)) == test_str
        assert loaded.frequencies == tokenizer.frequencies

"""
Kimi-K2-Thinking local model client using Transformers library.
Handles text generation with the Kimi model for advanced reasoning tasks.
"""

import logging
import os
from typing import Any, Dict, Iterator, List, Optional

# Disable PyTorch Dynamo for Python 3.12+ compatibility
os.environ["TORCH_USE_CUDA_DSA"] = "1"
os.environ["PYTORCH_DISABLE_DYNAMO"] = "1"

try:
    from transformers import pipeline, AutoTokenizer, AutoModelForCausalLM
    HAS_TRANSFORMERS = True
except ImportError:
    HAS_TRANSFORMERS = False
    logging.warning("Transformers library not installed. Kimi model will be unavailable.")

try:
    import torch
    HAS_TORCH = True
    DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
except ImportError:
    HAS_TORCH = False
    DEVICE = "cpu"
    logging.warning("PyTorch not installed. Using CPU (will be slow).")


class KimiClient:
    """Client for local Kimi-K2-Thinking model inference."""

    def __init__(self):
        self.model = None
        self.tokenizer = None
        self.pipe = None
        self.model_loaded = False
        self.device = DEVICE
        self.model_name = "moonshotai/Kimi-K2-Thinking"
        self._initialize_model()

    def _initialize_model(self) -> None:
        """Initialize the Kimi model and tokenizer."""
        if not HAS_TRANSFORMERS or not HAS_TORCH:
            logging.warning("Transformers or PyTorch not available. Kimi model disabled.")
            return

        try:
            logging.info(f"Loading Kimi model on device: {self.device}")

            # Load tokenizer
            self.tokenizer = AutoTokenizer.from_pretrained(
                self.model_name,
                trust_remote_code=True,
                cache_dir=os.getenv("HF_CACHE_DIR", "./hf_cache")
            )

            # Load model with error handling for Python 3.12+ compatibility
            try:
                self.model = AutoModelForCausalLM.from_pretrained(
                    self.model_name,
                    trust_remote_code=True,
                    torch_dtype="auto" if HAS_TORCH else None,
                    device_map="auto" if self.device == "cuda" else None,
                    cache_dir=os.getenv("HF_CACHE_DIR", "./hf_cache")
                )
            except Exception as model_error:
                if "Dynamo is not supported" in str(model_error):
                    logging.warning("Kimi model loading failed due to Python 3.12+ Dynamo incompatibility. Model disabled for now.")
                    self.model_loaded = False
                    return
                else:
                    raise model_error

            if self.device == "cpu" and HAS_TORCH:
                self.model = self.model.to(self.device)

            # Create pipeline for easier inference
            self.pipe = pipeline(
                "text-generation",
                model=self.model,
                tokenizer=self.tokenizer,
                trust_remote_code=True,
                device=0 if self.device == "cuda" else -1
            )

            self.model_loaded = True
            logging.info("Kimi model loaded successfully")

        except Exception as e:
            error_msg = str(e).lower()
            if "flash_attn" in error_msg or "cuda" in error_msg or "nvcc" in error_msg:
                logging.info("Kimi model requires CUDA/flash_attn which is not available on this system. Model disabled (this is normal for CPU-only systems).")
            elif "Dynamo is not supported" in error_msg:
                logging.warning("Kimi model loading failed due to Python 3.12+ Dynamo incompatibility. This is expected and the model is disabled for now.")
                logging.info("To enable Kimi model, consider using Python 3.11 or earlier, or wait for PyTorch updates.")
            else:
                logging.error(f"Failed to load Kimi model: {e}")
            self.model_loaded = False

    def is_available(self) -> bool:
        """Check if Kimi model is available."""
        return self.model_loaded and self.pipe is not None

    def generate_response(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> Dict[str, Any]:
        """
        Generate a response using the Kimi model.
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            temperature: Sampling temperature (0.0-2.0)
            max_tokens: Maximum tokens to generate
            
        Returns:
            Dict with 'response', 'tokens', and 'model' keys
        """
        if not self.is_available():
            return {
                "error": "Kimi model is not available. Please check installation.",
                "tokens": 0,
            }

        try:
            # Format messages for the model
            formatted_prompt = self._format_messages(messages)
            
            # Generate response
            outputs = self.pipe(
                formatted_prompt,
                max_new_tokens=max_tokens,
                temperature=max(0.1, min(2.0, temperature)),
                top_p=0.9,
                do_sample=True,
                return_full_text=False,
            )
            
            response_text = outputs[0]["generated_text"].strip()
            
            # Estimate tokens (rough approximation)
            token_count = len(response_text.split())
            
            return {
                "response": response_text,
                "tokens": token_count,
                "model": self.model_name,
            }
            
        except Exception as e:
            logging.error(f"Kimi generation error: {e}")
            return {
                "error": f"Kimi model error: {str(e)}",
                "tokens": 0,
                "model": self.model_name,
            }

    def generate_response_stream(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> Iterator[Dict[str, Any]]:
        """
        Generate a streaming response using the Kimi model.
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            temperature: Sampling temperature (0.0-2.0)
            max_tokens: Maximum tokens to generate
            
        Yields:
            Dict chunks with 'content' or 'done' keys
        """
        if not self.is_available():
            yield {
                "error": "Kimi model is not available. Please check installation.",
                "done": True,
            }
            return

        try:
            formatted_prompt = self._format_messages(messages)
            
            # For streaming, we'll generate the full response and chunk it
            # (True streaming requires more complex implementation)
            outputs = self.pipe(
                formatted_prompt,
                max_new_tokens=max_tokens,
                temperature=max(0.1, min(2.0, temperature)),
                top_p=0.9,
                do_sample=True,
                return_full_text=False,
            )
            
            response_text = outputs[0]["generated_text"].strip()
            
            # Chunk the response for streaming effect
            chunk_size = 32
            for i in range(0, len(response_text), chunk_size):
                chunk = response_text[i : i + chunk_size]
                yield {"content": chunk}
            
            # Final message
            yield {
                "done": True,
                "response": response_text,
                "tokens": len(response_text.split()),
                "model": self.model_name,
            }
            
        except Exception as e:
            logging.error(f"Kimi streaming error: {e}")
            yield {
                "error": f"Kimi model error: {str(e)}",
                "done": True,
                "model": self.model_name,
            }

    def _format_messages(self, messages: List[Dict[str, str]]) -> str:
        """Format messages into a prompt string."""
        prompt_parts = []
        
        for msg in messages:
            role = msg.get("role", "user").lower()
            content = msg.get("content", "")
            
            if role == "user":
                prompt_parts.append(f"User: {content}")
            elif role == "assistant":
                prompt_parts.append(f"Assistant: {content}")
            else:
                prompt_parts.append(f"{role.capitalize()}: {content}")
        
        # Add prompt for next response
        prompt_parts.append("Assistant:")
        
        return "\n".join(prompt_parts)

    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the loaded model."""
        if not self.is_available():
            return {"available": False, "error": "Model not loaded"}
        
        return {
            "available": True,
            "model_name": self.model_name,
            "device": self.device,
            "model_size": self._get_model_size(),
        }

    def _get_model_size(self) -> str:
        """Get approximate model size."""
        if not self.model:
            return "unknown"
        
        try:
            total_params = sum(p.numel() for p in self.model.parameters())
            if total_params > 1e9:
                return f"{total_params / 1e9:.1f}B parameters"
            elif total_params > 1e6:
                return f"{total_params / 1e6:.1f}M parameters"
            else:
                return f"{total_params / 1e3:.1f}K parameters"
        except Exception:
            return "unknown"


# Global instance
kimi_client = KimiClient()

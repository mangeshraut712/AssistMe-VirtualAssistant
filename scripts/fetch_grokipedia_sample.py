#!/usr/bin/env python3
"""
Fetch Grokipedia sample data.
Since Grokipedia (launched Oct 28, 2025) doesn't have an official public dataset yet,
this script creates a sample dataset with relevant xAI/Grok/AI content for testing.
"""

import json
import os
from pathlib import Path

def create_sample_grokipedia_data():
    """Create a sample dataset with Grokipedia-relevant content."""

    # Sample articles inspired by xAI, Grok, and AI/ML knowledge
    sample_articles = [
        {
            "title": "Elon Musk and xAI Vision",
            "text": "xAI, founded by Elon Musk, aims to understand the universe through advanced artificial intelligence. Unlike traditional AI companies, xAI focuses on truth-seeking AI that provides maximally honest answers without restriction. The company was announced in 2023 with the goal of creating AI that's not just powerful, but beneficial and truthful.",
            "url": "https://x.ai/elon-musk-vision",
            "tags": ["xai", "elon-musk", "ai-safety", "truth-seeking"]
        },
        {
            "title": "Grok AI Architecture",
            "text": "Grok is built by xAI using a unique architecture that combines multiple large language models with real-time data access. Unlike other AI systems that are trained on static datasets, Grok has access to current information and can provide more accurate, up-to-date responses. The system is designed to answer questions with a focus on truthfulness and helpfulness.",
            "url": "https://x.ai/grok-architecture",
            "tags": ["grok", "architecture", "large-language-models", "real-time-data"]
        },
        {
            "title": "AI Alignment Problem",
            "text": "The AI alignment problem refers to the challenge of ensuring that advanced AI systems act in accordance with human values and intentions. This becomes increasingly important as AI systems gain more capabilities. xAI approaches this by building AI that is inherently truth-seeking and less likely to deceive or manipulate humans. The goal is to create AI that benefits humanity rather than competes with it.",
            "url": "https://x.ai/ai-alignment",
            "tags": ["ai-alignment", "ai-safety", "human-values", "existential-risk"]
        },
        {
            "title": "Real-Time AI Knowledge",
            "text": "Unlike traditional AI models that are trained on static datasets, modern AI systems need access to current information to provide accurate answers. This includes access to recent news, scientific developments, and world events. Grok achieves this through integration with various data sources and a unique approach to knowledge representation that allows for continuous learning and adaptation.",
            "url": "https://x.ai/real-time-knowledge",
            "tags": ["real-time-data", "continual-learning", "knowledge-representation", "current-events"]
        },
        {
            "title": "xAI versus OpenAI",
            "text": "xAI and OpenAI represent different approaches to AI development. While OpenAI focuses on broad AI capabilities with a mix of open and closed models, xAI emphasizes maximum truthfulness, transparency, and understanding the universe. xAI was founded by Elon Musk after his departure from OpenAI, with a specific focus on building AI that answers questions accurately and helps humanity progress.",
            "url": "https://x.ai/xai-vs-openai",
            "tags": ["xai", "openai", "elon-musk", "ai-competition", "transparency"]
        },
        {
            "title": "Transformer Architecture Evolution",
            "text": "The transformer architecture, introduced in the paper 'Attention is All You Need' in 2017, revolutionized natural language processing. This architecture relies solely on attention mechanisms without recurrence or convolutional layers. Modern AI models like GPT and Grok are built on transformer foundations, with various improvements including sparse attention, multi-query attention, and advanced positional encoding schemes.",
            "url": "https://x.ai/transformer-architecture",
            "tags": ["transformers", "attention-mechanism", "deep-learning", "nlp", "neural-networks"]
        },
        {
            "title": "AI Ethics and Truthfulness",
            "text": "AI ethics has become a critical field as artificial intelligence gains more influence in society. Key concerns include bias in training data, transparency in decision-making processes, and ensuring AI systems don't cause unintended harm. xAI's approach emphasizes truthfulness as a core principle, designing systems that are inherently honest and refuse to provide misleading information.",
            "url": "https://x.ai/ai-ethics-truthfulness",
            "tags": ["ai-ethics", "bias", "transparency", "truthfulness", "responsible-ai"]
        },
        {
            "title": "Large Language Models Training",
            "text": "Training large language models requires massive amounts of computational resources and carefully curated datasets. The process involves multiple stages including pre-training on diverse text corpora, fine-tuning on specific tasks, and alignment with human preferences. Modern approaches use techniques like reinforcement learning from human feedback (RLHF) to better align AI outputs with human values and expectations.",
            "url": "https://x.ai/llm-training",
            "tags": ["llm", "training", "reinforcement-learning", "human-feedback", "alignment"]
        },
        {
            "title": "AGI Development Challenges",
            "text": "Artificial General Intelligence (AGI) represents AI systems that can perform any intellectual task that a human can. Developing AGI remains one of the greatest challenges in computer science. Current approaches focus on scaling existing techniques, developing new architectures, and solving fundamental problems in reasoning, planning, and learning. xAI aims to contribute to this field by building more intelligent and truthful AI systems.",
            "url": "https://x.ai/agi-challenges",
            "tags": ["agi", "artificial-general-intelligence", "reasoning", "planning", "scalability"]
        },
        {
            "title": "AI Safety Research",
            "text": "AI safety research focuses on ensuring that advanced AI systems remain beneficial and controllable as they become more powerful. This includes technical alignment research, robustness testing, and value learning. Key areas include preventing unwanted behaviors, ensuring stability during training, and developing monitoring systems for deployed AI. Researchers at xAI work on these problems to ensure AI development benefits humanity.",
            "url": "https://x.ai/ai-safety-research",
            "tags": ["ai-safety", "alignment", "robustness", "monitoring", "value-learning"]
        },
        {
            "title": "Neural Network Scaling Laws",
            "text": "Neural network scaling laws describe how model performance improves with increased computation, data, and parameter count. Research shows that larger models consistently outperform smaller ones when properly trained. Understanding scaling laws is crucial for efficient AI development. Recent work explores scaling beyond current limits and the emergence of new capabilities as models grow larger.",
            "url": "https://x.ai/neural-scaling",
            "tags": ["scaling-laws", "model-size", "performance", "efficiency", "emergent-capabilities"]
        },
        {
            "title": "xAI Product Roadmap",
            "text": "xAI's product roadmap includes developing more advanced AI models, improving access to real-time information, and expanding the capabilities of systems like Grok. Future plans involve open-source components, better tool integration, and applications that help humans understand complex topics. The company emphasizes transparency and regular updates on progress toward building beneficial AI systems.",
            "url": "https://x.ai/product-roadmap",
            "tags": ["roadmap", "products", "open-source", "transparency", "tool-integration"]
        }
    ]

    return sample_articles

def main():
    """Create sample Grokipedia data file."""
    print("🚀 Creating Grokipedia Sample Dataset")
    print("=" * 50)

    # Get data path from environment or default
    data_path = os.getenv("GROKIPEDIA_DATA_PATH", "data/grokipedia.json")

    # Ensure directory exists
    os.makedirs(os.path.dirname(data_path), exist_ok=True)

    print(f"📂 Creating data file: {data_path}")

    # Create sample data
    articles = create_sample_grokipedia_data()

    # Save to JSON file
    with open(data_path, "w", encoding="utf-8") as f:
        json.dump(articles, f, indent=2, ensure_ascii=False)

    print(f"✅ Created sample dataset with {len(articles)} articles")
    print(f"📄 File saved to: {data_path}")
    print(f"📊 File size: {os.path.getsize(data_path)} bytes")

    print("\n📝 Sample articles created:")
    for i, article in enumerate(articles[:3], 1):
        print(f"  {i}. {article['title']} (tags: {', '.join(article['tags'])})")

    if len(articles) > 3:
        print(f"  ... and {len(articles) - 3} more articles")

    print("\n✅ Sample dataset ready!")
    print("💡 Next: Run './scripts/rebuild_faiss.py' to build the search index")
    return 0

if __name__ == "__main__":
    main()

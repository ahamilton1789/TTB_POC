# TTB_POC
Hamilton's CV project

# TTB Label Verification App

AI-powered web application for verifying alcohol beverage labels against TTB application forms.

## Overview
This application simulates the TTB (Alcohol and Tobacco Tax and Trade Bureau) label approval process by using AI vision to extract information from label images and verify it matches the submitted form data.

## Features
- Form input for key TTB fields (Brand Name, Product Type, ABV, Net Contents)
- Image upload with preview
- AI-powered label text extraction using Claude Sonnet
- Comprehensive verification with detailed results
- Government warning detection
- Handles unreadable images gracefully

## Technology Stack
- **Frontend**: React with Tailwind CSS
- **AI/Vision**: Anthropic Claude API (vision capabilities)
- **Deployment**: [Your choice - Vercel, Netlify, etc.]

## Local Development

### Prerequisites
- Node.js 16+ installed
- Modern web browser

### Installation
1. Clone this repository
2. Open `index.html` in your browser (for standalone version)
   OR
3. For React development:
```bash
   npm install
   npm start
```

## Usage
1. Fill in the application form with product details
2. Upload an image of the alcohol label
3. Click "Verify Label" to analyze
4. Review the verification results

## Implementation Details

### AI Analysis Approach
- Uses Claude Sonnet's vision API instead of traditional OCR
- More accurate text extraction and understanding
- Can handle various label formats and styles
- Case-insensitive matching with tolerance for formatting differences

### Matching Logic
- **Brand Name**: Exact match (case-insensitive)
- **Product Type**: Fuzzy matching to handle variations
- **Alcohol Content**: Number matching with tolerance for format (e.g., "5%" vs "5.0% ABV")
- **Net Contents**: Format-flexible matching
- **Government Warning**: Checks for "GOVERNMENT WARNING" text presence

### Known Limitations
- Requires reasonably clear images
- Best results with standard label layouts
- API calls require network connection

## Deployment
Live demo: [Your deployed URL here]

## Future Enhancements
- Support for multiple beverage types with type-specific rules
- Image highlighting showing where text was found
- More sophisticated fuzzy matching with edit distance
- Database storage for audit trails
- Batch processing for multiple labels

## Author
Peter Rispoli

## License
MIT

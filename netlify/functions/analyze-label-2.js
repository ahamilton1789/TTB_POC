exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { image, formData } = JSON.parse(event.body);
    
    // Get API key from environment variable
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY not found in environment variables');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'API key not configured. Please add ANTHROPIC_API_KEY to Netlify environment variables.' })
      };
    }

    // Construct the prompt for Claude
    const prompt = `You are analyzing an alcohol beverage label for TTB (Alcohol and Tobacco Tax and Trade Bureau) compliance.

The applicant has provided the following information:
- Brand Name: ${formData.brandName}
- Product Class/Type: ${formData.productType}
- Alcohol Content: ${formData.alcoholContent}% ABV
${formData.netContents ? `- Net Contents: ${formData.netContents}` : ''}

Please analyze the uploaded label image and verify:

1. Does the brand name on the label match "${formData.brandName}"?
2. Does the product type/class on the label match "${formData.productType}"?
3. Does the alcohol content on the label match "${formData.alcoholContent}% ABV"?
${formData.netContents ? `4. Does the net contents on the label match "${formData.netContents}"?` : ''}
4. Does the label include the required government warning statement?
5. Can you read the text on the label clearly?

Please respond in the following JSON format:
{
  "readableImage": true/false,
  "overallMatch": true/false,
  "matches": {
    "brandName": true/false,
    "productType": true/false,
    "alcoholContent": true/false,
    "netContents": true/false,
    "governmentWarning": true/false
  },
  "extractedData": {
    "brandName": "what you found on the label",
    "productType": "what you found on the label",
    "alcoholContent": "numeric value only",
    "netContents": "what you found on the label",
    "governmentWarning": "present/absent/partial"
  },
  "notes": {
    "brandName": "brief explanation",
    "productType": "brief explanation",
    "alcoholContent": "brief explanation",
    "netContents": "brief explanation",
    "governmentWarning": "brief explanation"
  }
}`;

    console.log('Making request to Anthropic API...');

    // Make request to Anthropic API using fetch
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: image.mediaType,
                  data: image.data
                }
              },
              {
                type: 'text',
                text: prompt
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', errorText);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ 
          error: `API request failed: ${response.status} ${response.statusText}`,
          details: errorText
        })
      };
    }

    const apiResponse = await response.json();
    console.log('Received response from Anthropic API');
    
    const textContent = apiResponse.content.find(c => c.type === 'text')?.text || '';
    
    // Extract JSON from the response
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Could not find JSON in response:', textContent);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Could not parse response from AI' })
      };
    }

    const results = JSON.parse(jsonMatch[0]);
    console.log('Successfully parsed results');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(results)
    };

  } catch (error) {
    console.error('Error in function:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message || 'Internal server error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};

const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse the incoming request
    const requestBody = JSON.parse(event.body);
    const { image, formData } = requestBody;
    
    console.log('Received request with form data:', formData);
    console.log('Image media type:', image?.mediaType);
    console.log('Image data length:', image?.data?.length);
    
    if (!image || !image.data || !image.mediaType) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Invalid image data' })
      };
    }
    
    const API_KEY = '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';
    
    const prompt = `You are analyzing an alcohol beverage label image for TTB compliance verification.

The applicant submitted:
- Brand Name: "${formData.brandName}"
- Product Class/Type: "${formData.productType}"
- Alcohol Content: "${formData.alcoholContent}%"
${formData.netContents ? `- Net Contents: "${formData.netContents}"` : ''}

Analyze the label and extract:
1. Brand Name
2. Product Class/Type
3. Alcohol Content (ABV %)
4. Net Contents (volume)
5. Government Warning presence

Compare extracted data with form data. Check if they match (case-insensitive, allow format differences like "5%" vs "5.0% ABV").

Respond with ONLY this JSON structure, no markdown, no backticks:
{
  "extractedData": {
    "brandName": "text or null",
    "productType": "text or null",
    "alcoholContent": "number or null",
    "netContents": "text or null",
    "governmentWarning": true or false
  },
  "matches": {
    "brandName": true or false,
    "productType": true or false,
    "alcoholContent": true or false,
    "netContents": true or false,
    "governmentWarning": true or false
  },
  "notes": {
    "brandName": "explanation",
    "productType": "explanation",
    "alcoholContent": "explanation",
    "netContents": "explanation",
    "governmentWarning": "explanation"
  },
  "overallMatch": true or false,
  "readableImage": true or false
}`;

    console.log('Calling Claude API...');
    
    // Call Claude API
    const apiPayload = {
      model: 'claude-3-5-sonnet-20241022',
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
    };
    
    console.log('API payload structure:', {
      model: apiPayload.model,
      max_tokens: apiPayload.max_tokens,
      messageCount: apiPayload.messages.length,
      contentTypes: apiPayload.messages[0].content.map(c => c.type)
    });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(apiPayload)
    });

    console.log('API Response Status:', response.status);
    console.log('API Response Headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('API Response Body:', responseText);

    if (!response.ok) {
      console.error('Claude API Error:', responseText);
      return {
        statusCode: response.status,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ 
          error: 'API request failed',
          status: response.status,
          details: responseText 
        })
      };
    }

    const data = JSON.parse(responseText);
    const textContent = data.content?.find(item => item.type === 'text')?.text || '';
    
    console.log('Claude returned text:', textContent);
    
    // Clean the response - remove any markdown formatting
    let cleanedText = textContent
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();
    
    // Try to extract JSON if wrapped in other text
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanedText = jsonMatch[0];
    }
    
    console.log('Cleaned text for parsing:', cleanedText.substring(0, 200));
    
    let results;
    try {
      results = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Failed to parse:', cleanedText);
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ 
          error: 'Failed to parse Claude response',
          rawResponse: textContent.substring(0, 500)
        })
      };
    }

    console.log('Successfully parsed results:', results);

    // Return successful response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(results)
    };

  } catch (error) {
    console.error('Function error:', error);
    console.error('Error stack:', error.stack);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        stack: error.stack
      })
    };
  }
};
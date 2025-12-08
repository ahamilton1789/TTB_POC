const https = require('https');

exports.handler = async (event, context) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { image, formData } = JSON.parse(event.body);
    
    // Get API key from environment variable
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
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

    // Make request to Anthropic API
    const requestBody = JSON.stringify({
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
    });

    const response = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.anthropic.com',
        port: 443,
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Length': Buffer.byteLength(requestBody)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            body: data
          });
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(requestBody);
      req.end();
    });

    if (response.statusCode !== 200) {
      console.error('Anthropic API error:', response.body);
      throw new Error(`Anthropic API returned status ${response.statusCode}`);
    }

    const apiResponse = JSON.parse(response.body);
    const textContent = apiResponse.content.find(c => c.type === 'text')?.text || '';
    
    // Extract JSON from the response
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse JSON from Claude response');
    }

    const results = JSON.parse(jsonMatch[0]);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(results)
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: error.message || 'Internal server error'
      })
    };
  }
};

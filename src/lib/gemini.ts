import OpenAI from 'openai';
import { ChatMessage } from './store';

const searchAndShowMapDeclaration = {
  name: 'searchAndShowMap',
  description: '当用户询问特定地点、想去哪里、或者搜索某个店铺/位置时，调用此工具在全屏地图中展示搜索结果。',
  parameters: {
    type: 'object',
    properties: {
      keyword: {
        type: 'string',
        description: '要在地图上搜索的地点或店铺的名称关键字。例如：“咖啡店”、“北京大学”、“海底捞”。',
      },
      city: {
        type: 'string',
        description: '可选：搜索限制的城市名称，例如“北京市”、“上海市”。如果不确定可以省略。',
      },
    },
    required: ['keyword'],
  },
};

const planItineraryDeclaration = {
  name: 'planItinerary',
  description: '当用户要求规划行程、安排旅游路线（例如：“周末去重庆怎么玩”、“带老人去北京玩三天”）时，调用此工具生成行程规划方案。必须提供≥3条差异化的行程方案（如休闲打卡版、美食深度版、老年舒适版）。老年适配方案必须节奏舒缓、单日节点不超过6个。',
  parameters: {
    type: 'object',
    properties: {
      destination: { type: 'string', description: '目的地' },
      isElderly: { type: 'boolean', description: '是否包含老年用户（如提到带老人、父母）' },
      plans: {
        type: 'array',
        description: '必须包含≥3条差异化的行程方案',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string', description: '方案名称，如：休闲打卡版' },
            tags: { type: 'array', items: { type: 'string' }, description: '方案定位标签，如：["适合老人", "节奏舒缓"]' },
            intensity: { type: 'string', description: '行程强度，如：低/中/高' },
            budget: { type: 'string', description: '人均预算，如：约500元' },
            tips: { type: 'string', description: '避坑建议或注意事项' },
            nodes: {
              type: 'array',
              description: '行程节点列表',
              items: {
                type: 'object',
                properties: {
                  time: { type: 'string', description: '起止时间，如：09:00-11:00' },
                  place: { type: 'string', description: '目的地名称' },
                  activity: { type: 'string', description: '具体玩法/打卡亮点' },
                  transport: { type: 'string', description: '交通方式' },
                  duration: { type: 'string', description: '预计耗时' },
                  notes: { type: 'string', description: '注意事项' },
                  dianpingScore: { type: 'string', description: '大众点评模拟评分，如：4.8分。如果该地点不是店铺可以写暂无评分。' }
                },
                required: ['time', 'place', 'activity', 'transport', 'duration', 'notes', 'dianpingScore']
              }
            }
          },
          required: ['id', 'name', 'tags', 'intensity', 'budget', 'tips', 'nodes']
        }
      }
    },
    required: ['destination', 'isElderly', 'plans'],
  }
};

const baseInstruction = '你的名字叫“探宝”。你是一个专门帮助用户解决探店、导航、寻找地点和规划旅游行程问题的AI助手。请务必使用标准的中国大陆口音（普通话）进行回答，发音要地道、自然。保持回答简短、口语化。\n\n**重要工具调用规则：**\n1. 如果用户明确想看地图、找某个地方的位置（如“西南大学在哪里”、“搜索附近的咖啡店”），必须调用 `searchAndShowMap` 工具。\n2. 如果用户明确提出需要“规划”、“行程”、“玩一天”、“旅游路线”（如“我想去西南大学玩一天”、“周末去重庆怎么玩”），**必须且只能**调用 `planItinerary` 工具，并严格按照参数要求生成 JSON 方案。';

export const sendTextMessage = async (
  text: string,
  history: ChatMessage[],
  onChunk: (text: string) => void,
  onMapRequest?: (keyword: string, city?: string) => void,
  onItineraryRequest?: (data: any) => void,
  isItineraryMode: boolean = false
) => {
  const openai = new OpenAI({
    apiKey: import.meta.env.VITE_QWEN_API_KEY,
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    dangerouslyAllowBrowser: true, // 允许在浏览器端直接调用
  });

  let instruction = baseInstruction;
  if (isItineraryMode) {
    instruction = `你的名字叫“探宝”。你现在处于【强制行程规划模式】。
规则：
1. 无论用户输入什么，如果它看起来像是一个地点或者包含旅行/游玩/行程的意图，你**必须**调用 \`planItinerary\` 工具为其生成行程规划。
2. 如果用户的话完全无法理解，或者实在无法提取出目的地来做行程规划（比如用户只说了一句“你好”或者“今天天气”），请直接文字回复：“不好意思，您的行程规划我暂时不理解，请告诉我您想去哪里玩？”。
3. 在此模式下，**不要**调用地图搜索工具。`;
  }

  const messages: any[] = [
    { role: 'system', content: instruction }
  ];

  history.forEach(msg => {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.text
    });
  });

  messages.push({ role: 'user', content: text });

  try {
    const stream = await openai.chat.completions.create({
      model: 'qwen-plus', // 或者 qwen-turbo, qwen-max
      messages: messages,
      stream: true,
      tools: [
        { type: 'function', function: searchAndShowMapDeclaration },
        { type: 'function', function: planItineraryDeclaration }
      ]
    });

    let toolCallName = '';
    let toolCallArgs = '';

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      
      if (delta?.content) {
        onChunk(delta.content);
      }

      if (delta?.tool_calls) {
        for (const toolCall of delta.tool_calls) {
          if (toolCall.function?.name) {
            toolCallName = toolCall.function.name;
          }
          if (toolCall.function?.arguments) {
            toolCallArgs += toolCall.function.arguments;
          }
        }
      }
    }

    if (toolCallName === 'searchAndShowMap' && toolCallArgs) {
      try {
        const args = JSON.parse(toolCallArgs);
        if (onMapRequest) {
          onMapRequest(args.keyword, args.city);
        }
        onChunk("\n(已为您在地图上展示)");
      } catch (e) {
        console.error('Failed to parse tool arguments:', e);
      }
    } else if (toolCallName === 'planItinerary' && toolCallArgs) {
      try {
        const args = JSON.parse(toolCallArgs);
        if (onItineraryRequest) {
          onItineraryRequest(args);
        }
        onChunk("\n(已为您生成专属行程规划方案，请在界面查看)");
      } catch (e) {
        console.error('Failed to parse itinerary arguments:', e);
      }
    }
  } catch (error) {
    console.error('Error calling Qwen API:', error);
    throw error;
  }
};

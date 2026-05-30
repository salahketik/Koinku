
'use server';
/**
 * @fileOverview A GenAI flow for providing financial insights and text-to-speech feedback.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';
import wav from 'wav';

const FinancialInsightInputSchema = z.object({
  balance: z.number().describe('Current total balance of the user.'),
  monthlyIncome: z.number().describe('Total income for the current month.'),
  monthlyExpense: z.number().describe('Total expense for the current month.'),
  emergencyFundTarget: z.number().describe('The user target for emergency fund.'),
});

const FinancialInsightOutputSchema = z.object({
  insight: z.string().describe('A concise, helpful financial tip or insight (max 2 sentences).'),
  status: z.enum(['positive', 'neutral', 'warning']).describe('The sentiment of the financial status.'),
});

export async function getFinancialInsight(input: z.infer<typeof FinancialInsightInputSchema>) {
  return financialInsightFlow(input);
}

const prompt = ai.definePrompt({
  name: 'financialInsightPrompt',
  input: {schema: FinancialInsightInputSchema},
  output: {schema: FinancialInsightOutputSchema},
  prompt: `Anda adalah penasihat keuangan profesional untuk aplikasi KOIN KU. Analisis data pengguna dan berikan wawasan (insight) yang sangat spesifik dan membantu dalam Bahasa Indonesia.

Data Keuangan Pengguna:
- Saldo Total Saat Ini: Rp {{{balance}}}
- Pemasukan Bulan Ini: Rp {{{monthlyIncome}}}
- Pengeluaran Bulan Ini: Rp {{{monthlyExpense}}}
- Target Dana Darurat: Rp {{{emergencyFundTarget}}}

Panduan Analisis:
1. Berikan analisis berbasis rasio (misal: "Pengeluaran Anda mencapai X% dari pemasukan bulan ini").
2. Jika pengeluaran > pemasukan bulan ini, berikan status 'warning' dan saran pemotongan biaya konkret.
3. Jika saldo mendekati atau sudah mencapai target dana darurat, berikan status 'positive' dan apresiasi.
4. Gunakan gaya bahasa yang menyemangati namun realistis.
5. Maksimal 2 kalimat singkat.
6. Fokus pada performa "Bulan Ini" dibandingkan dengan "Saldo Total".`,
});

const financialInsightFlow = ai.defineFlow(
  {
    name: 'financialInsightFlow',
    inputSchema: FinancialInsightInputSchema,
    outputSchema: FinancialInsightOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);

export async function getFinancialInsightAudio(text: string) {
  return financialInsightAudioFlow(text);
}

const financialInsightAudioFlow = ai.defineFlow(
  {
    name: 'financialInsightAudioFlow',
    inputSchema: z.string(),
    outputSchema: z.object({ audio: z.string() }),
  },
  async (text) => {
    const { media } = await ai.generate({
      model: googleAI.model('gemini-2.5-flash-preview-tts'),
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Algenib' },
          },
        },
      },
      prompt: `Bacakan nasihat keuangan berikut dengan nada yang ramah dan memotivasi: ${text}`,
    });

    if (!media) throw new Error('No audio media returned');

    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );

    const wavBase64 = await toWav(audioBuffer);
    return {
      audio: 'data:audio/wav;base64,' + wavBase64,
    };
  }
);

async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    let bufs = [] as any[];
    writer.on('error', reject);
    writer.on('data', function (d) {
      bufs.push(d);
    });
    writer.on('end', function () {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
  });
}

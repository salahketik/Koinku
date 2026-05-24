'use server';
/**
 * @fileOverview A GenAI tool for suggesting categories for financial transactions.
 *
 * - suggestTransactionCategory - A function that suggests a category for a given transaction.
 * - TransactionCategorySuggestionInput - The input type for the suggestTransactionCategory function.
 * - TransactionCategorySuggestionOutput - The return type for the suggestTransactionCategory function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TransactionCategorySuggestionInputSchema = z.object({
  description: z.string().describe('The description of the new transaction.'),
  amount: z.number().describe('The amount of the new transaction.'),
  type: z.enum(['income', 'expense']).describe('The type of the new transaction (income or expense).'),
  pastTransactions: z.array(z.object({
    description: z.string().describe('Description of a past transaction.'),
    category: z.string().describe('Category assigned to the past transaction.'),
    type: z.enum(['income', 'expense']).describe('Type of the past transaction (income or expense).'),
  })).describe('A list of the user\'s past transactions with their categories.'),
});
export type TransactionCategorySuggestionInput = z.infer<typeof TransactionCategorySuggestionInputSchema>;

const TransactionCategorySuggestionOutputSchema = z.object({
  suggestedCategory: z.string().describe('The AI-suggested category for the new transaction.'),
  confidenceScore: z.number().min(0).max(100).describe('A confidence score (0-100) for the suggested category.'),
  reasoning: z.string().describe('Brief reasoning for the suggestion.'),
});
export type TransactionCategorySuggestionOutput = z.infer<typeof TransactionCategorySuggestionOutputSchema>;

export async function suggestTransactionCategory(input: TransactionCategorySuggestionInput): Promise<TransactionCategorySuggestionOutput> {
  return transactionCategorySuggestionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'transactionCategorySuggestionPrompt',
  input: {schema: TransactionCategorySuggestionInputSchema},
  output: {schema: TransactionCategorySuggestionOutputSchema},
  prompt: `You are an AI financial assistant that helps users categorize their transactions.\nGiven a new transaction and a list of past transactions with their categories, suggest the most appropriate category for the new transaction.\n\nHere are some of the user's past transactions and their assigned categories:\n{{#if pastTransactions}}\n{{#each pastTransactions}}\n- Type: {{{type}}}, Description: {{{description}}}, Category: {{{category}}}\n{{/each}}\n{{else}}\nNo past transactions provided.\n{{/if}}\n\nNew Transaction Details:\n- Type: {{{type}}}\n- Description: {{{description}}}\n- Amount: {{{amount}}}\n\nBased on the information above, suggest a single category that best fits the 'New Transaction'.\nPrioritize existing categories from past transactions as examples if they are a good fit.\nIf no clear existing category exists, suggest a new, appropriate and concise category.\nProvide a confidence score from 0 to 100 for your suggestion and a very brief reasoning in Indonesian.\n\nReturn the response in JSON format.`,
});

const transactionCategorySuggestionFlow = ai.defineFlow(
  {
    name: 'transactionCategorySuggestionFlow',
    inputSchema: TransactionCategorySuggestionInputSchema,
    outputSchema: TransactionCategorySuggestionOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);

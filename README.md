# Newsly - Analyze Polymarket Events

Newsly analyzes a inputed polymarket event headline and gives a 0 out of 10 likelihood score of every question.

Newsly is a AI tool uses gemini api and web search to rank every polymarket event question (0 is never happening and 10 is guaranteed to happen)

disclaimer: "guaranteed" is only based of the Newsly App on AI and Web searches, it is NOT perfect and can be wrong.

Newsly uses several search engines:

    - Google Search API

    - Brave Search API

    - Perplexity Search API 

Then GCP model gemini api compiles all the data from the web searches and then outputs a likelihood score of every polymarket event question.

It uses polymarkets official market fetching api to get all the questions about your inputed event.

the polymarket event you enter is the polymarket slug in the URL on polymarket site.

polymarket.com/event/<the event name you enter into Newsly>

pricing: $0.20 per request but you get a free $1 credit.

hope you enjoy it and have a fun time.
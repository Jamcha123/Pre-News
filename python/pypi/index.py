import argparse
import requests
import dotenv
import os

dotenv.load_dotenv()

def scrape_headlines(headline: str):
    google_link = " https://www.googleapis.com/customsearch/v1?key=api-key&cx=25b94c815e8514e88&q=" + headline
    google_data = requests.get(google_link).json()

    google_ans = ""
    for x in google_data["items"]:
        google_ans += "title: " + x["title"] + "\nurl: " + x["url"] + "\nsnippet: " + x["snippet"]
    
    brave_link = "https://api.search.brave.com/res/v1/web/search?q=" + headline
    brave_data = requests.get(brave_link, headers={"X-Subscription-Token": ""})

    brave_ans = ""

def predict_outcomes(headline: str, options: list[str]):
    pass

def main():
    args = argparse.ArgumentParser(prog="Analy python is a python pypi CLI", description="PreNews searches the web and lists the given outcomes as most to least likely ")
    args.add_argument("-n", "--news", required=True, help="enter a news headline to search and compare with your potentional outcomes that you entered ")
    args.add_argument("-o", "--outcomes", required=True, help="enter a list of potentional outcomes e.g outcome1,outcome2,outcome3 (seperate the outcomes using commas) ")

    parser = args.parse_args()
    return scrape_headlines(parser.news)

if __name__ == "__main__":
    print(main())

from setuptools import setup, find_packages

setup(
    name="Analy",
    description="Analy searches news headlines and lists potentional outcomes from most to least likely",
    author="Jamcha123",
    author_email="jameschambers732@gmail.com",
    packages=find_packages("pypi"), 
    url="https://github.com/Jamcha123/Pre-News",
    entry_points={
        "console_scripts": [
            "Analy=pypi.index:main",
        ],
    },
)
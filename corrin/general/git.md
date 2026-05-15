# Git & GitHub Tricks

## Custom Syntax Highlighting

You can use `.gitattributes` to specify custom syntax highlighting for files in GitHub. For example, if you have a file with a non-standard extension but want it to be highlighted as Python, you can add the following line to your `.gitattributes` file:

```sh
# treat all .myext files as Python for syntax highlighting
*.myext linguist-language=Python
```

This will tell GitHub to treat files with the `.myext` extension as Python files for syntax highlighting purposes.

## Linguist-Ignored Code

You can use `.gitattributes` to ignore certain files or directories from being displayed in diffs on GitHub. Such files can be auto-generated / vendored, so you would not want them to populate your diffs.

```sh
# ignore docs
docs/* linguist-vendored

# ignore auto-generated proto files
proto/* linguist-generated
```

## Git Logs for a File

You can use `git log --follow <file>` to see the commit history of a file, including renames. This is useful when you want to track the history of a file that has been renamed or moved in the repository.

```sh
git log --follow path/to/your/file
```

You can get a short summary of commits between your current version and the last version of the file with:

```sh
git log --follow --oneline path/to/your/file
```

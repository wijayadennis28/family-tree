import os
import argparse

def find_files(directory, exclude_patterns=None, include_extensions=None):
    """
    Find all files in a directory and its subdirectories.
    
    Args:
        directory (str): The directory to search in
        exclude_patterns (list): List of file patterns to exclude
        include_extensions (list): List of file extensions to include
    
    Returns:
        list: List of file paths
    """
    if exclude_patterns is None:
        exclude_patterns = ['.pyc', '__pycache__', '.git', '.svn', '.DS_Store']
    
    files_list = []
    
    try:
        for root, dirs, files in os.walk(directory):
            # Filter out excluded directories
            dirs[:] = [d for d in dirs if not any(pattern in d for pattern in exclude_patterns)]
            
            for file in files:
                # Skip files that match exclude patterns
                if any(pattern in file for pattern in exclude_patterns):
                    continue
                
                # If extensions specified, only include matching files
                if include_extensions:
                    if not any(file.endswith(ext) for ext in include_extensions):
                        continue
                
                full_path = os.path.join(root, file)
                files_list.append(full_path)
    except Exception as e:
        print(f"Error: {e}")
    
    return files_list

def main():
    parser = argparse.ArgumentParser(description='Find files in a directory and its subdirectories')
    parser.add_argument('directory', nargs='?', default='.', help='Directory to search (default: current directory)')
    parser.add_argument('--exclude', nargs='+', default=['.pyc', '__pycache__', '.git', '.svn'], 
                       help='Patterns to exclude (default: .pyc, __pycache__, .git, .svn)')
    parser.add_argument('--include-ext', nargs='+', help='Include only files with these extensions')
    
    args = parser.parse_args()
    
    found_files = find_files(args.directory, args.exclude, args.include_ext)
    
    print(f"Found {len(found_files)} files:")
    for file in found_files:
        print(file)

if __name__ == "__main__":
    main()
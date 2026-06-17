import os

def find_files(directory, exclude_patterns=None):
    """
    Find all files in a directory and its subdirectories, excluding certain patterns.
    
    Args:
        directory (str): The directory to search in
        exclude_patterns (list): List of file patterns to exclude
    
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
                if not any(pattern in file for pattern in exclude_patterns):
                    full_path = os.path.join(root, file)
                    files_list.append(full_path)
    except Exception as e:
        print(f"Error: {e}")
    
    return files_list

if __name__ == "__main__":
    # Example usage
    current_directory = "."
    found_files = find_files(current_directory)
    
    print(f"Found {len(found_files)} files:")
    for file in found_files:
        print(file)